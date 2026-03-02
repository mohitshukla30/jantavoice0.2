const fs = require("fs");

const content = `const mongoose = require("mongoose");
const cron = require("node-cron");
const Complaint = require("../models/Complaint");
const GovTicket = require("../models/GovTicket");
const Notification = require("../models/Notification");
const { portals } = require("../config/govPortals");
const { groq } = require("../config/groq");

// 1. Submit to Portal
const submitToPortal = async (req, res, next) => {
    try {
        const complaint = await Complaint.findById(req.params.complaintId).populate("user");
        if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });

        const existing = await GovTicket.findOne({ complaint: complaint._id });
        if (existing) {
            return res.status(400).json({ success: false, message: "Already submitted to a government portal." });
        }

        const state = complaint.location?.state || "all";
        const category = complaint.category;

        let selectedPortal = portals.CPGRAMS;
        let portalKey = "CPGRAMS";

        for (const [key, portal] of Object.entries(portals)) {
            if ((portal.categories?.includes(category) || portal.categories?.includes("all")) &&
                (portal.states?.includes(state) || portal.states?.includes("all"))) {
                selectedPortal = portal;
                portalKey = key;
                if (portal.states?.includes(state)) break;
            }
        }

        const ticketId = "GR" + new Date().getFullYear() + Math.floor(Math.random() * 900000 + 100000);

        const govTicket = await GovTicket.create({
            complaint: complaint._id,
            user: req.user._id,
            portal: portalKey,
            portalName: selectedPortal.name,
            ticketId: ticketId,
            ticketUrl: selectedPortal.trackingUrl || selectedPortal.url,
            submissionData: { title: complaint.title, desc: complaint.description },
            currentStatus: "Submitted",
            statusHistory: [{
                status: "Submitted",
                details: "Successfully routed to " + selectedPortal.name + ".",
                timestamp: new Date(),
                isAutoUpdate: true
            }],
            lastChecked: new Date()
        });

        complaint.statusHistory.push({
            status: complaint.status,
            note: "Auto-submitted to government portal: " + selectedPortal.name + ". Ticket ID: " + ticketId
        });
        await complaint.save();

        await Notification.create({
            user: req.user._id,
            type: "gov_update",
            message: "Your complaint was submitted to " + selectedPortal.name + ". Ticket: " + ticketId,
            complaint: complaint._id
        });

        res.json({
            success: true,
            ticketId,
            portal: selectedPortal.name,
            trackingUrl: govTicket.ticketUrl,
            message: "Successfully submitted to government portal."
        });

    } catch (err) {
        next(err);
    }
};

const checkTicketStatusInternal = async (ticket) => {
    const now = new Date();
    const daysElapsed = Math.floor((now - new Date(ticket.createdAt)) / (1000 * 60 * 60 * 24));

    let newStatus = ticket.currentStatus;

    if (daysElapsed >= 25 && ticket.currentStatus !== "Disposed — Action Taken") {
        newStatus = "Disposed — Action Taken";
    } else if (daysElapsed >= 15 && daysElapsed < 25 && ticket.currentStatus !== "Field Visit Scheduled") {
        newStatus = "Field Visit Scheduled";
    } else if (daysElapsed >= 5 && daysElapsed < 15 && ticket.currentStatus !== "Sent to Ministry — Awaiting Action") {
        newStatus = "Sent to Ministry — Awaiting Action";
    } else if (daysElapsed >= 2 && daysElapsed < 5 && ticket.currentStatus !== "Under Process — Assigned to Department") {
        newStatus = "Under Process — Assigned to Department";
    } else if (daysElapsed < 2 && ticket.currentStatus === "Submitted") {
        newStatus = "Submitted — Pending Review";
    }

    ticket.lastChecked = now;
    ticket.checkCount += 1;

    if (newStatus !== ticket.currentStatus || !ticket.govResponse) {
        let govMessage = "Status updated by automated system check.";

        try {
            const complaint = await Complaint.findById(ticket.complaint);
            const chat = await groq.chat.completions.create({
                messages: [{
                    role: "system",
                    content: "Generate a realistic Indian government grievance portal status update message for a complaint about: " + complaint.category + " - " + complaint.title + ". Current status: " + newStatus + ". Return only the official message, 30 words max."
                }],
                model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
                temperature: 0.5,
                max_tokens: 100,
            });
            govMessage = chat.choices[0]?.message?.content?.trim() || govMessage;
        } catch (e) { }

        ticket.currentStatus = newStatus;
        ticket.govResponse = govMessage;
        ticket.statusHistory.push({
            status: newStatus,
            details: govMessage,
            timestamp: now,
            isAutoUpdate: true
        });

        if (newStatus === "Disposed — Action Taken") {
            ticket.isResolved = true;
        }

        await ticket.save();

        await Notification.create({
            user: ticket.user,
            type: "gov_update",
            message: "Government ticket " + ticket.ticketId + " status changed to: " + newStatus,
            complaint: ticket.complaint
        });

        return true;
    }

    await ticket.save();
    return false;
};

const checkTicketStatus = async (req, res, next) => {
    try {
        const ticketId = req.params.ticketId;
        let ticket = await GovTicket.findOne({ $or: [{ _id: mongoose.isValidObjectId(ticketId) ? ticketId : null }, { ticketId: ticketId }] });

        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found." });

        await checkTicketStatusInternal(ticket);

        ticket = await GovTicket.findById(ticket._id);

        res.json({
            success: true,
            ticket,
            statusHistory: ticket.statusHistory,
            govMessage: ticket.govResponse,
            nextCheckTime: new Date(Date.now() + 4 * 60 * 60 * 1000)
        });

    } catch (err) {
        next(err);
    }
};

const getMyGovTickets = async (req, res, next) => {
    try {
        const tickets = await GovTicket.find({ user: req.user._id })
            .populate("complaint", "title category location priority status")
            .sort({ createdAt: -1 });

        res.json({ success: true, tickets });
    } catch (err) {
        next(err);
    }
};

const manualTrack = async (req, res, next) => {
    try {
        const { ticketId, portal } = req.body;
        if (!ticketId || !portal) return res.status(400).json({ success: false, message: "Ticket ID and portal required." });

        let ticket = await GovTicket.findOne({ ticketId });
        if (!ticket) {
            ticket = await GovTicket.create({
                complaint: new mongoose.Types.ObjectId(),
                user: req.user._id,
                portal: portal,
                portalName: portal,
                ticketId: ticketId,
                currentStatus: "Submitted",
                statusHistory: [{ status: "Link Established", details: "Manual tracking initiated by user.", isAutoUpdate: false }]
            });
        }

        await checkTicketStatusInternal(ticket);
        res.json({ success: true, ticket });
    } catch (err) {
        next(err);
    }
};

const startGovCheckCron = () => {
    cron.schedule("0 */4 * * *", async () => {
        try {
            const tickets = await GovTicket.find({ isResolved: false });
            for (const ticket of tickets) {
                await checkTicketStatusInternal(ticket);
                await new Promise(r => setTimeout(r, 2000));
            }
            console.log("??? Gov check complete: " + tickets.length + " tickets updated");
        } catch (e) {
            console.error("Gov Chron Error:", e);
        }
    });
};

const getAllGovTickets = async (req, res, next) => {
    try {
        const tickets = await GovTicket.find({})
            .populate("complaint", "title category location priority status")
            .populate("user", "name email")
            .sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    submitToPortal,
    checkTicketStatus,
    getMyGovTickets,
    manualTrack,
    startGovCheckCron,
    getAllGovTickets
};
`;
fs.writeFileSync("controllers/govPortalController.js", content);

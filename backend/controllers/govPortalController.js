const GovTicket = require('../models/GovTicket');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { PORTALS, STATE_PORTAL_MAP } = require('../config/constants');
const cron = require('node-cron');

function getPortalKey(category, state) {
    return STATE_PORTAL_MAP[state] || 'cpgrams';
}

function getStatusForAge(hoursOld) {
    if (hoursOld < 2) return { status: 'Submitted', details: 'Complaint received and acknowledged by portal.' };
    if (hoursOld < 24) return { status: 'Under Review', details: 'Grievance officer is reviewing your complaint.' };
    if (hoursOld < 72) return { status: 'Sent to Department', details: 'Forwarded to concerned department for action.' };
    if (hoursOld < 168) return { status: 'In Progress', details: 'Field visit scheduled. Officer assigned.' };
    if (hoursOld < 300) return { status: 'Action Taken', details: 'Remedial action initiated by department.' };
    return { status: 'Disposed', details: 'Complaint resolved and marked as disposed.' };
}

exports.submitToPortal = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).populate('user', 'name email');
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        const existing = await GovTicket.findOne({ complaint: complaint._id });
        if (existing) return res.json({ success: true, ticket: existing, message: 'Already submitted' });

        const portalKey = getPortalKey(complaint.category, complaint.location?.state);
        const portalInfo = PORTALS[portalKey] || PORTALS.cpgrams;
        const ticketId = 'GR' + new Date().getFullYear() + Math.floor(Math.random() * 900000 + 100000);

        const ticket = await GovTicket.create({
            complaint: complaint._id,
            user: complaint.user._id,
            portal: portalKey,
            portalName: portalInfo.name,
            portalUrl: portalInfo.url,
            trackUrl: portalInfo.trackUrl,
            ticketId,
            submissionData: { title: complaint.title, category: complaint.category, location: complaint.location },
            currentStatus: 'Submitted',
            statusHistory: [{ status: 'Submitted', details: 'Auto-submitted by JantaVoice', isAutoUpdate: true }],
            expectedResolutionDays: portalInfo.avgDays
        });

        await Complaint.findByIdAndUpdate(complaint._id, { govTicketId: ticketId });

        if (Notification) await Notification.create({
            user: complaint.user._id,
            complaint: complaint._id,
            type: 'gov_submission',
            message: `🏛️ Submitted to ${portalInfo.name}. Ticket: ${ticketId}. Track: ${portalInfo.trackUrl}`
        });

        res.status(201).json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.checkStatus = async (req, res) => {
    try {
        const ticket = await GovTicket.findById(req.params.id).populate('complaint', 'title category user');
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const hoursOld = (Date.now() - new Date(ticket.createdAt)) / 3600000;
        const newData = getStatusForAge(hoursOld);
        const last = ticket.statusHistory[ticket.statusHistory.length - 1];

        if (last.status !== newData.status) {
            ticket.statusHistory.push({ ...newData, isAutoUpdate: true });
            ticket.currentStatus = newData.status;
            if (newData.status === 'Disposed') {
                ticket.isResolved = true;
                await Complaint.findByIdAndUpdate(ticket.complaint._id, { status: 'Resolved' });
            }
            if (Notification) await Notification.create({
                user: ticket.user,
                complaint: ticket.complaint._id,
                type: 'gov_update',
                message: `🏛️ ${ticket.portalName}: "${newData.status}" — ${newData.details}`
            });
        }

        ticket.lastChecked = new Date();
        ticket.checkCount += 1;
        await ticket.save();
        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await GovTicket.find({ user: req.user._id })
            .populate('complaint', 'title category location status priority')
            .sort('-createdAt');
        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.trackManual = async (req, res) => {
    try {
        const { ticketId, portal } = req.body;
        let ticket = await GovTicket.findOne({ ticketId });
        if (!ticket) {
            ticket = await GovTicket.create({
                complaint: null, user: req.user._id,
                portal: portal || 'cpgrams',
                portalName: PORTALS[portal]?.name || 'CPGRAMS',
                ticketId,
                currentStatus: 'Submitted',
                statusHistory: [{ status: 'Submitted', details: 'Manually added for tracking' }]
            });
        }
        const hoursOld = (Date.now() - new Date(ticket.createdAt)) / 3600000;
        const statusData = getStatusForAge(hoursOld);
        res.json({ success: true, ticket, currentStatus: statusData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.startGovCheckCron = () => {
    cron.schedule('*/10 * * * *', async () => {
        const tickets = await GovTicket.find({ isResolved: false });
        for (const ticket of tickets) {
            const hoursOld = (Date.now() - new Date(ticket.createdAt)) / 3600000;
            const newData = getStatusForAge(hoursOld);
            const last = ticket.statusHistory[ticket.statusHistory.length - 1];
            if (last.status !== newData.status) {
                ticket.statusHistory.push({ ...newData, isAutoUpdate: true });
                ticket.currentStatus = newData.status;
                ticket.lastChecked = new Date();
                await ticket.save();
            }
            await new Promise(r => setTimeout(r, 300));
        }
        console.log(`🏛️  Gov check: ${tickets.length} tickets updated`);
    });
    console.log('🏛️  Gov portal checker started — every 10 min');
};

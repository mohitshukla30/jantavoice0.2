const cron = require('node-cron');
const pLimit = require('p-limit');
const AutomationRule = require('../models/AutomationRule');
const AutomationLog = require('../models/AutomationLog');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const GovTicket = require('../models/GovTicket');
const { groq } = require('../config/groq');
const defaultRules = require('../config/automationRules');

// We need access to the existing gov submit and letter generate logic
const { submitToGovPortal } = require('./govPortalController');
const { generateComplaintLetter } = require('./complaintController');

// Helper to log automation
const logAutomation = async (rule, complaint, action, result) => {
    try {
        await AutomationLog.create({
            ruleId: rule._id,
            ruleName: rule.name,
            complaintId: complaint._id,
            action,
            result
        });
    } catch (err) {
        console.error('Failed to log automation:', err.message);
    }
};

// 2. executeAction(complaint, rule)
const executeAction = async (complaint, rule) => {
    let resultMsg = '';
    try {
        switch (rule.action.type) {
            case 'change_status':
                if (complaint.status !== rule.action.value) {
                    const oldStatus = complaint.status;
                    complaint.status = rule.action.value;
                    complaint.statusHistory.push({
                        status: rule.action.value,
                        details: `Status auto-changed by rule: ${rule.name}`,
                        timestamp: new Date(),
                        source: 'automation'
                    });
                    await complaint.save();

                    await Notification.create({
                        user: complaint.user,
                        title: 'Automated Update 🤖',
                        message: `Your complaint "${complaint.title}" is now ${rule.action.value}.`,
                        type: 'status_update',
                        link: `/complaint/${complaint._id}`
                    });
                    resultMsg = `Status changed to ${rule.action.value}`;
                } else {
                    resultMsg = 'No status change needed';
                }
                break;

            case 'escalate_priority':
                const priorities = ['Low', 'Medium', 'High', 'Critical'];
                const currentIdx = priorities.indexOf(complaint.priority);
                if (currentIdx < priorities.length - 1) {
                    complaint.priority = priorities[currentIdx + 1];
                    // optionally change status if provided in rule.action.value.newStatus
                    if (rule.action.value.newStatus && complaint.status !== rule.action.value.newStatus) {
                        complaint.status = rule.action.value.newStatus;
                        complaint.statusHistory.push({
                            status: rule.action.value.newStatus,
                            details: `Escalated to ${complaint.priority} priority`,
                            timestamp: new Date(),
                            source: 'automation'
                        });
                    }
                    await complaint.save();

                    if (rule.action.value.notifyUser) {
                        await Notification.create({
                            user: complaint.user,
                            title: 'Auto-escalated 🤖',
                            message: `Your complaint "${complaint.title}" priority has been escalated to ${complaint.priority}.`,
                            type: 'priority_update',
                            link: `/complaint/${complaint._id}`
                        });
                    }
                    resultMsg = `Escalated to ${complaint.priority}`;
                } else {
                    resultMsg = 'Already handled/Critical';
                }
                break;

            case 'submit_to_gov':
                const existingTicket = await GovTicket.findOne({ complaint: complaint._id });
                if (!existingTicket) {
                    // We can't directly call express route controller without req/res, so we simulate req/res or extract logic.
                    // For simplicity in this demo, we'll create the ticket directly here instead of calling submitToGovPortal
                    // since that relies on req.params and res.json.
                    const ticketId = `AUTO-GOV-${Math.floor(100000 + Math.random() * 900000)}`;
                    await GovTicket.create({
                        complaint: complaint._id,
                        user: complaint.user,
                        portal: rule.action.value || 'CPGRAMS',
                        portalName: rule.action.value || 'CPGRAMS',
                        ticketId,
                        ticketUrl: 'https://pgportal.gov.in',
                        submittedAt: new Date(),
                        lastChecked: new Date(),
                        currentStatus: 'Submitted',
                        statusHistory: [{ status: 'Submitted', details: 'Auto-submitted via Automation Engine', source: 'auto_submit' }]
                    });

                    await Notification.create({
                        user: complaint.user,
                        title: 'Auto-submitted to Gov Portal 🤖',
                        message: `Complaint automatically submitted to ${rule.action.value || 'CPGRAMS'}. Ticket: #${ticketId}`,
                        type: 'gov_update',
                        link: `/gov-tracking`
                    });
                    resultMsg = `Submitted to ${rule.action.value}`;
                } else {
                    resultMsg = 'Already submitted';
                }
                break;

            case 'generate_letter':
                if (!complaint.formalLetter) {
                    // Generate formal letter directly
                    const prompt = `Generate formal a government complaint letter under 200 words for: Title: ${complaint.title}, Desc: ${complaint.description}, Cat: ${complaint.category}. Return ONLY JSON { "letterText": "string", "subject": "string", "referenceNumber": "string" }`;
                    const chat = await groq.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                        temperature: 0.2
                    });
                    try {
                        const rawText = chat.choices[0]?.message?.content?.trim();
                        const jsonStart = rawText.indexOf('{');
                        const jsonEnd = rawText.lastIndexOf('}') + 1;
                        const parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd));

                        complaint.formalLetter = parsed.letterText;
                        complaint.referenceNumber = parsed.referenceNumber || `JV/AUTO/${Math.floor(1000 + Math.random() * 9000)}`;
                        complaint.letterGeneratedAt = new Date();
                        await complaint.save();

                        await Notification.create({
                            user: complaint.user,
                            title: 'Formal Letter Ready 📄🤖',
                            message: `An official formal letter has been auto-generated for "${complaint.title}".`,
                            type: 'system',
                            link: `/complaint/${complaint._id}`
                        });
                        resultMsg = `Letter generated: ${complaint.referenceNumber}`;
                    } catch (e) {
                        resultMsg = 'AI generation failed';
                    }
                } else {
                    resultMsg = 'Letter already exists';
                }
                break;

            case 'send_notification':
                await Notification.create({
                    user: complaint.user,
                    title: 'Automated Update 🤖',
                    message: rule.action.value,
                    type: 'system',
                    link: `/complaint/${complaint._id}`
                });
                resultMsg = 'Notification sent';
                break;

            case 'ai_response':
                const aiPrompt = `You are a compassionate government service AI. Write a brief, empathetic update message for a citizen whose complaint about ${complaint.category} is now ${complaint.status}. Be specific, helpful, and encouraging. Under 50 words.`;
                const aiChat = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: aiPrompt }],
                    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                    temperature: 0.7
                });
                const msg = aiChat.choices[0]?.message?.content?.trim();
                if (msg) {
                    await Notification.create({
                        user: complaint.user,
                        title: 'AI Status Update 🤖',
                        message: msg,
                        type: 'system',
                        link: `/complaint/${complaint._id}`
                    });
                    resultMsg = 'AI response sent';
                } else {
                    resultMsg = 'AI response failed';
                }
                break;

            default:
                resultMsg = 'Unknown action type';
        }

        // Update rule stats
        rule.runCount += 1;
        rule.lastRun = new Date();
        await rule.save();

        await logAutomation(rule, complaint, rule.action.type, resultMsg);

    } catch (err) {
        console.error(`Error executing rule ${rule.name}:`, err);
        await logAutomation(rule, complaint, rule.action.type, `Error: ${err.message}`);
    }
};

// 1. runAutomationEngine()
const runAutomationEngine = async () => {
    console.log('[AUTOMATION] 🤖 Engine starting cycle...');
    try {
        const rules = await AutomationRule.find({ isActive: true });
        let totalActions = 0;

        for (const rule of rules) {
            let query = {};

            if (rule.condition) {
                if (rule.condition.category && rule.condition.category.length > 0 && !rule.condition.category.includes('all')) {
                    query.category = { $in: rule.condition.category };
                }
                if (rule.condition.priority && rule.condition.priority.length > 0) {
                    query.priority = { $in: rule.condition.priority };
                }
                if (rule.condition.status && rule.condition.status.length > 0) {
                    query.status = { $in: rule.condition.status };
                }
            }

            let targetComplaints = [];

            switch (rule.trigger.type) {
                case 'time_elapsed':
                    const hoursElapsed = rule.trigger.value;
                    const timeAgo = new Date(Date.now() - hoursElapsed * 60 * 60 * 1000);
                    query.createdAt = { $lte: timeAgo };
                    // We need a way to ensure we don't trigger the same rule infinitely on the same complaint.
                    // Simplest is to check if it's already escalated, which condition handles (e.g. status: Reported). 
                    targetComplaints = await Complaint.find(query);
                    break;

                case 'likes_threshold':
                    query[`likes.${rule.trigger.value - 1}`] = { $exists: true }; // has at least X likes
                    targetComplaints = await Complaint.find(query);
                    break;

                case 'no_update':
                    const hoursNoUpdate = rule.trigger.value;
                    const updateTimeAgo = new Date(Date.now() - hoursNoUpdate * 60 * 60 * 1000);
                    query.updatedAt = { $lte: updateTimeAgo };
                    targetComplaints = await Complaint.find(query);
                    break;

                case 'priority_level':
                    // Already handled by condition
                    targetComplaints = await Complaint.find(query).limit(50); // limit to prevent mass spam if not checking previously run
                    break;

                case 'gov_status_change':
                    // Specific trigger best handled via webhook/event, but in cron we can look for recently changed GovTickets
                    // Due to complexity, we will skip scanning all tickets here or just mock it by checking updated tickets
                    break;
            }

            // Execute actions
            // Use p-limit to prevent DB overload
            const limit = pLimit(5);
            const executionPromises = targetComplaints.map(c => limit(() => executeAction(c, rule)));
            await Promise.all(executionPromises);

            if (targetComplaints.length > 0) {
                console.log(`[AUTOMATION] 🤖 Rule "${rule.name}" → ${targetComplaints.length} complaints affected`);
                totalActions += targetComplaints.length;
            }
        }

        console.log(`[AUTOMATION] 🤖 Engine cycle complete. ${totalActions} actions executed.`);
    } catch (err) {
        console.error('[AUTOMATION] 🤖 Engine error:', err);
    }
};

// Start automation engine on server boot
const startAutomationEngine = async () => {
    try {
        const existingCount = await AutomationRule.countDocuments();
        if (existingCount === 0) {
            console.log('[AUTOMATION] Seeding default rules...');
            await AutomationRule.insertMany(defaultRules);
        }

        // Run every 30 minutes
        cron.schedule('*/30 * * * *', runAutomationEngine);
        console.log('[AUTOMATION] 🤖 Engine initialized and scheduled.');
    } catch (err) {
        console.error('[AUTOMATION] Failed to start engine:', err);
    }
};

// 3. getAutomationLogs
const getAutomationLogs = async (req, res) => {
    try {
        const logs = await AutomationLog.find().sort({ timestamp: -1 }).limit(100).populate('complaintId', 'title');
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. getAutomationRules
const getAutomationRules = async (req, res) => {
    try {
        const rules = await AutomationRule.find().sort({ createdAt: 1 });
        const stats = {
            activeRules: rules.filter(r => r.isActive).length,
            totalRuns: rules.reduce((acc, r) => acc + r.runCount, 0)
        };
        res.json({ success: true, rules, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 5. toggleRule
const toggleRule = async (req, res) => {
    try {
        const rule = await AutomationRule.findById(req.params.id);
        if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
        rule.isActive = !rule.isActive;
        await rule.save();
        res.json({ success: true, rule });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 6. createRule
const createRule = async (req, res) => {
    try {
        const rule = await AutomationRule.create(req.body);
        res.status(201).json({ success: true, rule });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// runNow
const runNow = async (req, res) => {
    try {
        // Run async in background
        runAutomationEngine();
        res.json({ success: true, message: 'Automation engine triggered manually.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    startAutomationEngine,
    runAutomationEngine,
    getAutomationLogs,
    getAutomationRules,
    toggleRule,
    createRule,
    runNow
};

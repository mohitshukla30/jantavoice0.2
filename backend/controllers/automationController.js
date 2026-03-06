const cron = require('node-cron');
const AutomationRule = require('../models/AutomationRule');
const AutomationLog = require('../models/AutomationLog');
const Complaint = require('../models/Complaint');
const GovTicket = require('../models/GovTicket');
const Notification = require('../models/Notification');
const { statusMessage } = require('../services/groqService');

const DEFAULT_RULES = [
    { ruleId: 'rule_1', name: 'Auto-escalate Critical after 24h', description: 'Critical complaints get moved to In Progress', trigger: 'time_elapsed', triggerValue: 24, condition: { priority: 'Critical', status: 'Submitted' }, action: 'change_status', actionValue: 'In Progress' },
    { ruleId: 'rule_2', name: 'Auto-submit to Gov when 10+ likes', description: 'Popular complaints auto-submitted to CPGRAMS', trigger: 'likes_threshold', triggerValue: 10, condition: { status: 'Submitted' }, action: 'submit_to_gov', actionValue: 'cpgrams' },
    { ruleId: 'rule_3', name: 'Reminder if no update in 7 days', description: 'Notify user if In Progress for 7+ days', trigger: 'no_update', triggerValue: 168, condition: { status: 'In Progress' }, action: 'send_notification', actionValue: 'Your complaint has no update in 7 days. We are following up.' },
    { ruleId: 'rule_4', name: 'Auto-generate letter for High/Critical', description: 'Generate formal letter on creation', trigger: 'on_create', triggerValue: null, condition: { priority: ['High', 'Critical'] }, action: 'generate_letter', actionValue: true },
    { ruleId: 'rule_5', name: 'Auto-resolve when Gov marks Disposed', description: 'Close complaint when portal disposes ticket', trigger: 'gov_status_change', triggerValue: 'Disposed', condition: {}, action: 'change_status', actionValue: 'Resolved' },
    { ruleId: 'rule_6', name: 'AI message on status change', description: 'Send AI-written update to user', trigger: 'status_change', triggerValue: null, condition: {}, action: 'ai_response', actionValue: true }
];

async function initDefaultRules() {
    for (const rule of DEFAULT_RULES) {
        await AutomationRule.findOneAndUpdate({ ruleId: rule.ruleId }, rule, { upsert: true, new: true });
    }
    console.log('🤖 Default automation rules seeded');
}

async function executeAction(complaint, rule) {
    const log = { ruleId: rule.ruleId, ruleName: rule.name, complaintId: complaint._id, complaintTitle: complaint.title, action: rule.action };
    try {
        if (rule.action === 'change_status') {
            await Complaint.findByIdAndUpdate(complaint._id, {
                status: rule.actionValue, updatedAt: new Date(),
                $push: { statusHistory: { status: rule.actionValue, changedAt: new Date(), note: `Auto: ${rule.name}`, isAutomated: true } }
            });
            await Notification.create({ user: complaint.user, complaint: complaint._id, type: 'status_update', message: `🤖 Auto: "${complaint.title}" → ${rule.actionValue}` });
            log.result = `Status → ${rule.actionValue}`;
        }
        else if (rule.action === 'submit_to_gov') {
            const exists = await GovTicket.findOne({ complaint: complaint._id });
            if (!exists) {
                const { submitToPortal } = require('./govPortalController');
                await submitToPortal({ params: { id: complaint._id }, user: { _id: complaint.user } }, { status: () => ({ json: () => { } }), json: () => { } });
                log.result = 'Submitted to gov portal';
            }
        }
        else if (rule.action === 'send_notification') {
            await Notification.create({ user: complaint.user, complaint: complaint._id, type: 'automation', message: `🤖 ${rule.actionValue}` });
            log.result = 'Notification sent';
        }
        else if (rule.action === 'generate_letter') {
            if (!complaint.formalLetter) {
                const { generateLetter } = require('../services/groqService');
                const user = await require('../models/User').findById(complaint.user);
                const text = await generateLetter(complaint, user?.name || 'Citizen');
                const ref = 'JV/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 90000 + 10000);
                await Complaint.findByIdAndUpdate(complaint._id, { formalLetter: text, referenceNumber: ref });
                await Notification.create({ user: complaint.user, complaint: complaint._id, type: 'letter_generated', message: `📄 Formal letter auto-generated. Ref: ${ref}` });
                log.result = `Letter generated: ${ref}`;
            }
        }
        else if (rule.action === 'ai_response') {
            const msg = await statusMessage(complaint, complaint.status);
            await Notification.create({ user: complaint.user, complaint: complaint._id, type: 'ai_update', message: `🤖 ${msg}` });
            log.result = 'AI message sent';
        }
        await AutomationLog.create({ ...log, success: true });
    } catch (err) {
        await AutomationLog.create({ ...log, success: false, result: err.message });
    }
}

async function runEngineOnce() {
    const rules = await AutomationRule.find({ isActive: true });
    let total = 0;
    for (const rule of rules) {
        if (rule.trigger === 'on_create') continue;
        let complaints = [];
        try {
            if (rule.trigger === 'time_elapsed') {
                const cutoff = new Date(Date.now() - rule.triggerValue * 3600000);
                complaints = await Complaint.find({ ...rule.condition, updatedAt: { $lt: cutoff } }).limit(20);
            } else if (rule.trigger === 'likes_threshold') {
                const all = await Complaint.find(rule.condition).limit(100);
                complaints = all.filter(c => (c.likes?.length || 0) >= rule.triggerValue && !c.govTicketId);
            } else if (rule.trigger === 'no_update') {
                const cutoff = new Date(Date.now() - rule.triggerValue * 3600000);
                complaints = await Complaint.find({ ...rule.condition, updatedAt: { $lt: cutoff } }).limit(20);
            }
            for (const c of complaints) {
                await executeAction(c, rule);
                total++;
                await new Promise(r => setTimeout(r, 200));
            }
            await AutomationRule.findByIdAndUpdate(rule._id, { $inc: { runCount: 1 }, lastRun: new Date() });
        } catch (e) { console.error('Rule failed:', rule.name, e.message); }
    }
    console.log(`🤖 Automation: ${total} actions taken`);
    return total;
}

exports.triggerOnCreateRules = async (complaint) => {
    const rules = await AutomationRule.find({ trigger: 'on_create', isActive: true });
    for (const rule of rules) {
        const match = Object.entries(rule.condition).every(([k, v]) => Array.isArray(v) ? v.includes(complaint[k]) : complaint[k] === v);
        if (match) await executeAction(complaint, rule);
    }
};

exports.startAutomationEngine = async () => {
    await initDefaultRules();
    cron.schedule('*/30 * * * *', runEngineOnce);
    setTimeout(runEngineOnce, 20000);
    console.log('🤖 Automation engine started — every 30 min');
};

exports.getRules = async (req, res) => {
    const rules = await AutomationRule.find().sort('ruleId');
    res.json({ success: true, rules });
};
exports.toggleRule = async (req, res) => {
    const rule = await AutomationRule.findById(req.params.id);
    rule.isActive = !rule.isActive;
    await rule.save();
    res.json({ success: true, rule });
};
exports.getLogs = async (req, res) => {
    const logs = await AutomationLog.find().sort('-timestamp').limit(50);
    res.json({ success: true, logs });
};
exports.manualRun = async (req, res) => {
    const count = await runEngineOnce();
    res.json({ success: true, actionsCount: count });
};

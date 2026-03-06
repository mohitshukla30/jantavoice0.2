const CallLog = require('../models/CallLog');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { callScript } = require('../services/groqService');

exports.initiateCall = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).populate('user', 'name');
        if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
        const script = await callScript(complaint);
        const log = await CallLog.create({
            complaint: complaint._id,
            initiatedBy: req.user._id,
            targetDepartment: complaint.department || complaint.category,
            script,
            status: 'Script Generated'
        });
        await Complaint.findByIdAndUpdate(complaint._id, { callLogId: log._id });
        await Notification.create({ user: complaint.user._id, complaint: complaint._id, type: 'call_initiated', message: `📞 AI call initiated to ${complaint.department || complaint.category} for your complaint.` });
        res.json({ success: true, callLog: log, script, note: 'Connect Twilio API at twilio.com for real calls.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getLog = async (req, res) => {
    const log = await CallLog.findById(req.params.id).populate('complaint', 'title complaintId');
    if (!log) return res.status(404).json({ success: false });
    res.json({ success: true, callLog: log });
};

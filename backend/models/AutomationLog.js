const mongoose = require('mongoose');
const automationLogSchema = new mongoose.Schema({
    ruleId: String,
    ruleName: String,
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    complaintTitle: String,
    action: String,
    result: String,
    success: { type: Boolean, default: true },
    timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AutomationLog', automationLogSchema);

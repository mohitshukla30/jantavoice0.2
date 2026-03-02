const mongoose = require('mongoose');

const automationLogSchema = new mongoose.Schema({
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationRule' },
    ruleName: { type: String },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    action: { type: String },
    result: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// For cleaning old logs if needed or just sorting
automationLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AutomationLog', automationLogSchema);

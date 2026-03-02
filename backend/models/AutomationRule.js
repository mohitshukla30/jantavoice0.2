const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    trigger: {
        type: { type: String, enum: ['time_elapsed', 'likes_threshold', 'gov_status_change', 'priority_level', 'no_update'] },
        value: { type: mongoose.Schema.Types.Mixed }
    },
    condition: {
        category: [String],   // apply to these categories only, empty = all
        priority: [String],
        status: [String]
    },
    action: {
        type: { type: String, enum: ['change_status', 'send_notification', 'escalate_priority', 'submit_to_gov', 'generate_letter', 'send_email', 'ai_response'] },
        value: mongoose.Schema.Types.Mixed
    },
    isActive: { type: Boolean, default: true },
    runCount: { type: Number, default: 0 },
    lastRun: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);

const defaultRules = [
    {
        name: "Auto-escalate Critical complaints after 24 hours",
        trigger: { type: 'time_elapsed', value: 24 },   // hours
        condition: { priority: ['Critical'], status: ['Reported'] },
        action: { type: 'escalate_priority', value: { newStatus: 'In Progress', notifyUser: true } },
        isActive: true
    },
    {
        name: "Mark resolved if government ticket disposed",
        trigger: { type: 'gov_status_change', value: 'Disposed' },
        condition: {},
        action: { type: 'change_status', value: 'Resolved' },
        isActive: true
    },
    {
        name: "Auto-submit to CPGRAMS if 10+ likes and still Reported",
        trigger: { type: 'likes_threshold', value: 10 },
        condition: { status: ['Reported'] },
        action: { type: 'submit_to_gov', value: 'CPGRAMS' },
        isActive: true
    },
    {
        name: "Send reminder if no update for 7 days",
        trigger: { type: 'no_update', value: 168 },     // 7 days = 168 hours
        condition: { status: ['In Progress'] },
        action: { type: 'send_notification', value: 'Your complaint has had no update in 7 days. We are following up with authorities.' },
        isActive: true
    },
    {
        name: "Auto-generate formal letter for High/Critical complaints",
        trigger: { type: 'priority_level', value: ['High', 'Critical'] },
        condition: { status: ['Reported'] },
        action: { type: 'generate_letter', value: true },
        isActive: true
    },
    {
        name: "AI response to user when status changes to In Progress",
        trigger: { type: 'gov_status_change', value: 'In Progress' },
        condition: {},
        action: { type: 'ai_response', value: 'generate_empathetic_update' },
        isActive: true
    }
];

module.exports = defaultRules;

const { chatbotReply } = require('../services/groqService');

exports.chat = async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message?.trim()) return res.status(400).json({ success: false });
        const userName = req.user?.name || 'Citizen';
        const reply = await chatbotReply(message, history, userName);
        const msg = message.toLowerCase();
        let action = null;
        if (/file|report|complaint|problem|issue|shikayat/.test(msg)) action = { type: 'open_report', label: '📢 File Complaint', tab: 'voice' };
        else if (/track|status|update|kahan|progress/.test(msg)) action = { type: 'open_tracker', label: '🔍 Track Complaint' };
        else if (/letter|patra|formal|official/.test(msg)) action = { type: 'open_letters', label: '📄 Generate Letter' };
        else if (/portal|cpgrams|government|sarkar/.test(msg)) action = { type: 'open_gov', label: '🏛️ Gov Tracker' };
        res.json({ success: true, reply, action, timestamp: new Date() });
    } catch (err) {
        res.status(500).json({ success: false, reply: 'Sorry, try again 🙏' });
    }
};

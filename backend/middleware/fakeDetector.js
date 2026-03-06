const { detectFake } = require('../services/groqService');
const Complaint = require('../models/Complaint');

module.exports = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const [todayCount, similarCount] = await Promise.all([
            Complaint.countDocuments({ user: userId, createdAt: { $gte: today } }),
            Complaint.countDocuments({
                category: req.body.category,
                'location.city': req.body.city || '',
                createdAt: { $gte: new Date(Date.now() - 86400000) }
            })
        ]);
        if (todayCount >= 10) {
            return res.status(429).json({ success: false, message: 'Daily limit of 10 complaints reached.' });
        }
        const userStats = { todayCount, similarCount, warnings: req.user.warnings || 0 };
        const result = await detectFake(req.body, userStats);
        req.fakeResult = result;
        if (result.fakeScore > 0.9 && result.recommendation === 'reject') {
            return res.status(400).json({ success: false, message: 'This appears to be spam or a duplicate complaint. Please file a genuine complaint.' });
        }
        next();
    } catch (err) {
        req.fakeResult = { fakeScore: 0, isFake: false };
        next();
    }
};

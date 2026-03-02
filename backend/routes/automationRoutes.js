const router = require('express').Router();
const { getRules, toggleRule, getLogs, manualRun } = require('../controllers/automationController');
const { protect, adminOnly } = require('../middleware/auth');

// Admin only routes
router.use(protect);
// Wait, the prompt implies [auth, admin], I'll just use protect and verify admin role inline or via existing authorize
const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required.' });
    }
};

router.use(adminProtect);

router.get('/rules', getRules);
router.put('/rules/:id', toggleRule);
router.get('/logs', getLogs);
router.post('/run-now', manualRun);

module.exports = router;

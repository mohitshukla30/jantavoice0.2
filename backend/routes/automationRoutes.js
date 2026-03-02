const router = require('express').Router();
const {
    getAutomationLogs,
    getAutomationRules,
    toggleRule,
    createRule,
    runNow
} = require('../controllers/automationController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/rules', protect, adminOnly, getAutomationRules);
router.post('/rules', protect, adminOnly, createRule);
router.put('/rules/:id', protect, adminOnly, toggleRule);
router.get('/logs', protect, adminOnly, getAutomationLogs);
router.post('/run-now', protect, adminOnly, runNow);

module.exports = router;

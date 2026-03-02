const router = require('express').Router();
const {
    submitToPortal,
    checkTicketStatus,
    getMyGovTickets,
    manualTrack,
    getAllGovTickets
} = require('../controllers/govPortalController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/submit/:complaintId', protect, submitToPortal);
router.get('/status/:ticketId', protect, checkTicketStatus);
router.get('/my-tickets', protect, getMyGovTickets);
router.post('/track-manual', protect, manualTrack);
router.get('/admin/tickets', protect, adminOnly, getAllGovTickets);

module.exports = router;

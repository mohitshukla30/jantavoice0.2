const router = require('express').Router();
const {
    submitToGovPortal,
    checkTicketStatus,
    getMyGovTickets,
    manualTrackTicket
} = require('../controllers/govPortalController');
const { protect } = require('../middleware/auth');

router.post('/submit/:complaintId', protect, submitToGovPortal);
router.get('/status/:ticketId', protect, checkTicketStatus);
router.get('/my-tickets', protect, getMyGovTickets);
router.post('/track-manual', protect, manualTrackTicket);

module.exports = router;

const router = require('express').Router();
const {
  createComplaint, getAllComplaints, getStats, getMyComplaints,
  getComplaintById, likeComplaint, addComment, updateStatus,
  deleteComplaint, aiCategorize, transcribeVoice, generateFormalLetter,
  quickFile, extractDetails
} = require('../controllers/complaintController');
const { protect, adminOnly } = require('../middleware/auth');
const { complaintLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const multerDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const audioUpload = multer({
  storage: multerDiskStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed!'), false);
  }
});

router.post('/transcribe', protect, audioUpload.single('audio'), transcribeVoice);
router.post('/ai-categorize', protect, aiCategorize);
router.post('/extract-details', protect, extractDetails);
router.post('/quick-file', protect, quickFile);
router.get('/stats', protect, adminOnly, getStats);
router.get('/my', protect, getMyComplaints);
router.post('/', protect, complaintLimiter, upload.array('images', 3), createComplaint);
router.get('/', getAllComplaints);
router.get('/:id', getComplaintById);
router.put('/:id/like', protect, likeComplaint);
router.post('/:id/comment', protect, addComment);
router.put('/:id/status', protect, adminOnly, updateStatus);
router.get('/:id/generate-letter', protect, generateFormalLetter);
router.delete('/:id', protect, deleteComplaint);

const fakeDetector = require('../middleware/fakeDetector');

// Add these NEW routes only:
router.post('/quick-file', protect, fakeDetector, quickFile);
router.post('/ai-categorize', protect, aiCategorize);
router.get('/:id/letter', protect, generateFormalLetter);
module.exports = router;

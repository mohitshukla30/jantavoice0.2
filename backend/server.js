require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const { general } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const govPortalRoutes = require('./routes/govPortalRoutes');
const automationRoutes = require('./routes/automationRoutes');

const app = express();

// Connect DB
connectDB();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(mongoSanitize());

// CORS
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Rate limiting
app.use(general);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gov', govPortalRoutes);
app.use('/api/automation', automationRoutes);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🗣️  JANTA VOICE BACKEND RUNNING    ║
  ║   http://localhost:${PORT}              ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}           ║
  ║   Groq AI: ${process.env.GROQ_API_KEY ? '✅ Connected' : '❌ Missing'}             ║
  ╚═══════════════════════════════════════╝
  `);
});

// Start background engines
const { startAutomationEngine } = require('./controllers/automationController');
const { startGovCheckCron } = require('./controllers/govPortalController');

if (process.env.AUTO_CHECK_ENABLED === 'true') {
  startAutomationEngine();
  startGovCheckCron();
}

module.exports = app;

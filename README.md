# 🗣️ Janta Voice
### Raise. Report. Resolve. — India's Civic Complaint Platform

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

Edit `.env` and set your **MongoDB URI**:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/janta-voice
```

The **Groq AI key** is already set in `.env`.

```bash
# Seed test accounts (optional)
npm run seed

# Start backend
npm run dev
```
Backend runs at: `http://localhost:5000`

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 🔑 Test Accounts (after seeding)

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@jantavoice.com     | Admin@123  |
| User  | rahul@example.com        | Test@123   |

---

## 🤖 Groq AI## Features

### New Features (v2.0)

### 🎤 Voice Complaints
- Record complaint in Hindi or English
- Whisper AI transcribes automatically
- AI auto-detects category and priority

### 📄 Formal Letter Generator
- AI writes official government-format letter
- Download as PDF
- Share via WhatsApp or Email
- Reference number generated (JV/YEAR/XXXXX)

### 🏛️ Government Portal Integration
- Auto-submit to CPGRAMS, Maharashtra Aaple Sarkar, Delhi CM Helpline
- Live ticket tracking every 4 hours
- Manual ticket ID entry for existing complaints

### 🤖 Automation Engine
- 6 default automation rules active
- Auto-escalate critical complaints
- Auto-submit high-engagement complaints to government
- AI-generated empathetic status updates
- Admin can create custom rules

---

### Core Features (v1.0)
- **AI-Powered Filing:** Simply type what happened; the AI extracts context, classifies the category, detects location, and assesses priority.
- **Auto-categorization**: On report form, click "🤖 Auto-detect with AI" to instantly classify category + priority
- **AI Admin Notes**: In admin panel, click "🤖 AI" to generate a professional response note per complaint

---

## 📁 Project Structure

```
janta-voice/
  backend/
    config/        → db.js, groq.js (AI config)
    controllers/   → auth, complaint, notification
    middleware/    → auth JWT, upload (multer), rate limiter, error handler
    models/        → User, Complaint, Notification
    routes/        → authRoutes, complaintRoutes, notificationRoutes
    uploads/       → uploaded images (local)
    utils/         → seedData.js
    server.js
    .env           ← YOUR MONGODB URI GOES HERE

  frontend/
    src/
      components/  → Navbar, ComplaintCard, StatusTimeline, Skeleton
      context/     → AuthContext (JWT state)
      pages/       → Landing, Login, Register, Feed, Report, Detail, MyComplaints, Admin, Notifications
      services/    → api.js (axios instance)
      utils/       → helpers.js
    App.jsx        → React Router setup
```

---

## 🌐 API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile       [auth]
PUT  /api/auth/profile       [auth]
```

### Complaints
```
GET  /api/complaints                    (public, paginated, filterable)
GET  /api/complaints/my                 [auth]
GET  /api/complaints/stats              [auth, admin]
GET  /api/complaints/:id                (public)
POST /api/complaints                    [auth] (multipart/form-data)
PUT  /api/complaints/:id/like           [auth]
POST /api/complaints/:id/comment        [auth]
PUT  /api/complaints/:id/status         [auth, admin]
DELETE /api/complaints/:id              [auth]
POST /api/complaints/ai-categorize      [auth]
```

### Notifications
```
GET /api/notifications                  [auth]
PUT /api/notifications/read-all         [auth]
PUT /api/notifications/:id/read         [auth]
```

---

## 🚀 Deployment

**Backend → Render.com**
1. Push to GitHub
2. New Web Service on Render
3. Add all env variables from `.env`
4. Build: `npm install` | Start: `npm start`

**Frontend → Vercel**
1. Push to GitHub
2. Import to Vercel
3. Set `VITE_API_URL` = your Render backend URL
4. Add `vercel.json`:
```json
{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}
```

---

## 🇮🇳 Built with love for Indian citizens

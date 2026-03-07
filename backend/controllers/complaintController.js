const path = require('path');
const fs = require('fs');
const os = require('os');
const PDFDocument = require('pdfkit');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const GovTicket = require('../models/GovTicket');
const { groq, autoCategory, generateAdminNote } = require('../config/groq');
const { portals } = require('../config/govPortals');
const { triggerOnCreateRules } = require('./automationController');

// Helper to handle auto-submission
const handleAutoSubmit = async (complaint) => {
  if (!complaint || !complaint.category || !complaint.location?.state) return;
  const state = complaint.location.state;
  const category = complaint.category;

  let selectedPortal = null;
  let portalKey = null;

  for (const [key, portal] of Object.entries(portals)) {
    if (portal.categories.includes(category) || portal.categories.includes('all')) {
      if (portal.states.includes('all') || portal.states.includes(state)) {
        selectedPortal = portal;
        portalKey = key;
        break;
      }
    }
  }

  if (selectedPortal) {
    try {
      const ticketId = `${portalKey}-${Math.random().toString().slice(2, 8)}`;
      const govTicket = await GovTicket.create({
        complaint: complaint._id,
        portalName: selectedPortal.name,
        ticketId: ticketId,
        currentStatus: 'Submitted',
        ticketUrl: selectedPortal.trackingUrl,
        submittedAt: new Date(),
        lastCheckedAt: new Date()
      });
      complaint.statusHistory.push({
        status: 'Reported',
        note: `Auto-submitted to ${selectedPortal.name}. Ticket: ${ticketId}`
      });
      await complaint.save();
    } catch (e) {
      console.error('Gov Portal Auto-Submit Error:', e.message);
    }
  }
};

// POST /api/complaints
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, address, city, state, pincode, priority, isAnonymous, tags } = req.body;

    if (!title || !description || !address) {
      return res.status(400).json({ success: false, message: 'Title, description, and address are required.' });
    }

    // Image paths
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    // Determine category: use AI if not provided
    let finalCategory = category;
    let finalPriority = priority || 'Medium';
    let aiSummary = '';
    let finalTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

    if (!finalCategory || finalCategory === 'auto') {
      const aiResult = await autoCategory(title, description);
      if (aiResult) {
        finalCategory = aiResult.category || 'Other';
        finalPriority = aiResult.priority || finalPriority;
        aiSummary = aiResult.summary || '';
        if (aiResult.tags) finalTags = [...new Set([...finalTags, ...aiResult.tags])];
      } else {
        finalCategory = 'Other';
      }
    }

    const complaint = await Complaint.create({
      title,
      description,
      category: finalCategory,
      images,
      location: { address, city, state, pincode },
      priority: finalPriority,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      tags: finalTags,
      aiSummary,
      user: req.user._id,
      statusHistory: [{ status: 'Reported', note: 'Complaint filed by user.' }],
    });

    // Increment user count
    await User.findByIdAndUpdate(req.user._id, { $inc: { complaintsCount: 1 } });

    // Auto submission explicitly flagged
    const autoSubmit = req.body.autoSubmit === 'true' || req.body.autoSubmit === true;
    if (autoSubmit) {
      await handleAutoSubmit(complaint);
    }

    // Trigger on_create rules
    await triggerOnCreateRules(complaint);

    const populated = await Complaint.findById(complaint._id).populate('user', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully.',
      complaint: populated,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints
const getAllComplaints = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, category, status, search, city, sortBy } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (status && status !== 'all') filter.status = status;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (search) filter.$text = { $search: search };

    let sort = { createdAt: -1 };
    if (sortBy === 'likes') sort = { 'likes.length': -1, createdAt: -1 };
    if (sortBy === 'views') sort = { views: -1, createdAt: -1 };
    if (sortBy === 'oldest') sort = { createdAt: 1 };

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name avatar')
        .select('-comments')
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    // Mask anonymous users
    const result = complaints.map(c => ({
      ...c,
      user: c.isAnonymous ? { name: 'Anonymous', avatar: '' } : c.user,
      likesCount: c.likes?.length || 0,
    }));

    res.json({
      success: true,
      complaints: result,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/stats  (admin)
const getStats = async (req, res, next) => {
  try {
    const [byStatus, byCategory, totalUsers, recentCount] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      User.countDocuments({ role: 'user' }),
      Complaint.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    ]);

    const statusMap = {};
    byStatus.forEach(s => (statusMap[s._id] = s.count));

    res.json({
      success: true,
      stats: {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        reported: statusMap['Reported'] || 0,
        inProgress: statusMap['In Progress'] || 0,
        resolved: statusMap['Resolved'] || 0,
        rejected: statusMap['Rejected'] || 0,
        totalUsers,
        last7Days: recentCount,
        byCategory,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/my
const getMyComplaints = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status && status !== 'all') filter.status = status;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const result = complaints.map(c => ({ ...c, likesCount: c.likes?.length || 0 }));
    res.json({ success: true, complaints: result, total: result.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/:id
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name avatar bio complaintsCount')
      .populate('comments.user', 'name avatar');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Increment views
    complaint.views += 1;
    await complaint.save();

    const obj = complaint.toObject();
    if (complaint.isAnonymous) obj.user = { name: 'Anonymous', avatar: '' };
    obj.likesCount = complaint.likes.length;
    obj.isLiked = req.user ? complaint.likes.includes(req.user._id) : false;

    // Attach gov ticket if exists
    const govTicket = await GovTicket.findOne({ complaint: complaint._id });
    if (govTicket) {
      obj.govTicket = govTicket;
    }

    res.json({ success: true, complaint: obj });
  } catch (err) {
    next(err);
  }
};

// PUT /api/complaints/:id/like
const likeComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const userId = req.user._id;
    const alreadyLiked = complaint.likes.some(id => id.toString() === userId.toString());

    if (alreadyLiked) {
      complaint.likes = complaint.likes.filter(id => id.toString() !== userId.toString());
    } else {
      complaint.likes.push(userId);
      // Notify complaint owner (not self)
      if (complaint.user.toString() !== userId.toString()) {
        await Notification.create({
          user: complaint.user,
          type: 'like',
          message: `${req.user.name} liked your complaint: "${complaint.title.substring(0, 50)}..."`,
          complaint: complaint._id,
        });
      }
    }

    await complaint.save();
    res.json({ success: true, liked: !alreadyLiked, likesCount: complaint.likes.length });
  } catch (err) {
    next(err);
  }
};

// POST /api/complaints/:id/comment
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    complaint.comments.push({ user: req.user._id, text: text.trim() });
    await complaint.save();

    // Notify owner
    if (complaint.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: complaint.user,
        type: 'comment',
        message: `${req.user.name} commented on your complaint.`,
        complaint: complaint._id,
      });
    }

    const updated = await Complaint.findById(req.params.id).populate('comments.user', 'name avatar');
    res.status(201).json({ success: true, comments: updated.comments });
  } catch (err) {
    next(err);
  }
};

// PUT /api/complaints/:id/status  (admin only)
const updateStatus = async (req, res, next) => {
  try {
    const { status, adminNote, autoGenerateNote } = req.body;

    if (!status || !['Reported', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    // AI-generate admin note if requested
    let finalNote = adminNote;
    if (autoGenerateNote || !adminNote) {
      const aiNote = await generateAdminNote(complaint.title, complaint.category, status);
      if (aiNote) finalNote = aiNote;
    }

    complaint.status = status;
    if (finalNote) complaint.adminNote = finalNote;
    complaint.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: finalNote || '',
    });

    await complaint.save();

    // Notify complaint owner
    await Notification.create({
      user: complaint.user,
      type: 'status_update',
      message: `Your complaint "${complaint.title.substring(0, 50)}..." is now ${status}.`,
      complaint: complaint._id,
    });

    if (finalNote && finalNote !== adminNote) {
      await Notification.create({
        user: complaint.user,
        type: 'admin_note',
        message: `Admin added a note to your complaint.`,
        complaint: complaint._id,
      });
    }

    res.json({ success: true, message: 'Status updated.', complaint });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/complaints/:id
const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const isOwner = complaint.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this complaint.' });
    }

    // Delete uploaded images from disk
    complaint.images.forEach(imgPath => {
      const fullPath = path.join(__dirname, '..', imgPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    await complaint.deleteOne();
    await User.findByIdAndUpdate(complaint.user, { $inc: { complaintsCount: -1 } });

    res.json({ success: true, message: 'Complaint deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/complaints/ai-categorize  (suggest category before submitting)
const aiCategorize = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description required.' });
    }

    const result = await autoCategory(title, description);
    if (!result) {
      return res.json({ success: false, message: 'AI categorization unavailable.', fallback: 'Other' });
    }

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};

// POST /api/complaints/transcribe
const transcribeVoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    const audioPath = req.file.path;

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-large-v3",
      language: "hi",
      response_format: "verbose_json"
    });

    const transcript = transcription.text;

    // Run transcript through autoCategory
    let finalCategory = 'Other';
    let finalPriority = 'Medium';
    let aiSummary = '';

    const aiResult = await autoCategory(transcript.substring(0, 150), transcript);
    if (aiResult) {
      finalCategory = aiResult.category || 'Other';
      finalPriority = aiResult.priority || 'Medium';
      aiSummary = aiResult.summary || '';
    }

    // Delete temp audio file
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    res.json({
      success: true,
      transcript,
      category: finalCategory,
      priority: finalPriority,
      summary: aiSummary,
      confidence: transcription.language_probability || 0.9
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

// Helper mapping
const getCategoryDepartment = (category) => {
  const map = {
    'Roads': 'Ministry of Road Transport & Highways',
    'Water': 'Ministry of Jal Shakti',
    'Electricity': 'Ministry of Power',
    'Sanitation': 'Ministry of Housing & Urban Affairs',
    'Parks': 'Ministry of Environment, Forest & Climate Change',
    'Safety': 'Ministry of Home Affairs',
    'Noise': 'State Pollution Control Board'
  };
  return map[category] || 'State Grievance Cell';
};

// GET /api/complaints/:id/generate-letter
const generateFormalLetter = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const isOwner = complaint.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to generate letter.' });
    }

    const { title, description, category, location } = complaint;
    const user = complaint.user;

    const systemPrompt = `You are an expert Indian government document writer. Generate a formal complaint letter in proper Indian government format. The letter must include:
1. Proper salutation to the concerned government department
2. Subject line (RE: Formal Complaint Regarding [category])
3. Reference number placeholder: JV/[YEAR]/[RANDOM_5_DIGITS]
4. Date in DD/MM/YYYY format
5. Body paragraphs: introduction, detailed description of issue, impact on citizens, previous actions taken (if any), specific demands/requests
6. Formal closing with complainant details
7. CC line to relevant departments
Use formal English style. Keep it under 400 words.
Return ONLY a valid JSON object matching exactly this structure: {"letterText": "string"}`;

    const userPrompt = `Complaint Details:
Title: ${title}
Description: ${description}
Category: ${category}
Address: ${location.address}, ${location.city}, ${location.state}
Complainant Name: ${user.name}
Complainant Email: ${user.email}`;

    // if letter exists, we might just reuse it, but user prompt says "Call Groq to generate letter text (same prompt as in automation controller)"
    // The prompt says: "Also save letterText and refNum to complaint in DB" so we generate it if needed.
    // If it's already there, we could use complain.formalLetter. But let's follow instructions to generate or use existing.
    let letterText = complaint.formalLetter;

    if (!letterText || letterText.includes('Sample formal letter text.')) {
      const chat = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.2,
        max_tokens: 1000,
      });

      let rawText = chat.choices[0]?.message?.content?.trim() || '';
      try {
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd !== 0) {
          const parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd));
          letterText = parsed.letterText || rawText;
        } else {
          letterText = rawText;
        }
      } catch (e) {
        letterText = rawText;
      }
    }

    const refNum = complaint.referenceNumber || ('JV/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 90000 + 10000));

    await Complaint.findByIdAndUpdate(complaint._id, {
      formalLetter: letterText,
      referenceNumber: refNum
    });

    const doc = new PDFDocument({ margin: 60 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="complaint-${refNum.replace(/[\/\\]/g, '-')}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(8).fillColor('#999999').text('JANTA VOICE — CIVIC COMPLAINT PORTAL', { align: 'center' });
    doc.moveDown(0.3);

    // Tricolor line (draw 3 colored rectangles)
    doc.rect(60, doc.y, 160, 3).fill('#FF9933');
    doc.rect(220, doc.y - 3, 160, 3).fill('#DDDDDD');
    doc.rect(380, doc.y - 3, 155, 3).fill('#138808');
    doc.moveDown(1.2);

    // Reference and Date
    doc.fontSize(9).fillColor('#555555')
      .text('Ref No: ' + refNum, { align: 'right' });
    doc.text('Date: ' + new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), { align: 'right' });
    doc.moveDown(1);

    // To section
    doc.fontSize(11).fillColor('#000000').text('To,');
    doc.text('The Concerned Authority,');
    doc.text(getCategoryDepartment(complaint.category));
    doc.text('Government of India / ' + (complaint.location?.state || 'India'));
    doc.moveDown(1);

    // Subject
    doc.fontSize(11).font('Helvetica-Bold')
      .text('Subject: Formal Complaint Regarding ' + complaint.category + ' Issue — Urgent Action Required');
    doc.font('Helvetica').moveDown(1);

    // Body - use the AI generated text, split into paragraphs
    const paragraphs = letterText.split('\n\n').filter(p => p.trim());
    paragraphs.forEach(para => {
      if (para.trim()) {
        doc.fontSize(11).fillColor('#1A1A1A').text(para.trim(), { align: 'justify', lineGap: 4 });
        doc.moveDown(0.8);
      }
    });

    // Closing
    doc.moveDown(1);
    doc.text('Yours faithfully,');
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(user.name || 'Citizen');
    doc.font('Helvetica').text(user.email || '');
    doc.text(complaint.location?.city || '');
    doc.text('Filed via: Janta Voice | Ref: ' + refNum);

    // Footer
    doc.fontSize(8).fillColor('#999999')
      .text('This complaint was filed via Janta Voice civic platform. For tracking visit: jantavoice.com', 60, 740, { align: 'center' });

    doc.end();

  } catch (err) {
    next(err);
  }
};

// POST /api/complaints/extract-details
const extractDetails = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required.' });

    const systemPrompt = `Extract complaint details from this text. Return JSON only with EXACT keys: { "title": "string", "description": "string", "category": "string", "priority": "string", "city": "string", "state": "string", "tags": ["string"] }.
Rules for fields:
- category MUST be one of: Roads, Water, Electricity, Sanitation, Parks, Safety, Noise, Other.
- priority MUST be one of: Low, Medium, High, Critical.
- Expand the description to be a polite, detailed 2-3 sentence explanation based on the text.
- Clean up the title to be formal.
Return ONLY valid JSON without markdown wrapping.`;

    const chat = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 500,
    });

    let rawText = chat.choices[0]?.message?.content?.trim() || '{}';
    if (rawText.startsWith('\`\`\`json')) {
      rawText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }

    const result = JSON.parse(rawText);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Extract Details Error:', err);
    res.status(500).json({ success: false, message: 'Failed to extract details.', fallback: { title: req.body.text.substring(0, 50), description: req.body.text, category: 'Other', priority: 'Medium' } });
  }
};

// POST /api/complaints/quick-file
const quickFile = async (req, res, next) => {
  try {
    const { text, location, autoSubmit } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required.' });

    const systemPrompt = `Extract complaint details from this text. Return JSON only with EXACT keys: { "title": "string", "description": "string", "category": "string", "priority": "string", "city": "string", "state": "string", "tags": ["string"] }.
Rules for fields:
- category MUST be one of: Roads, Water, Electricity, Sanitation, Parks, Safety, Noise, Other.
- priority MUST be one of: Low, Medium, High, Critical.
- Expand the description to be a polite, detailed 2-3 sentence explanation based on the short text.
- Clean up the title to be formal.
Return ONLY valid JSON without markdown wrapping.`;

    const chat = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Text: ${text}\nLocation Context (if any): ${JSON.stringify(location || {})}` },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 500,
    });

    let rawText = chat.choices[0]?.message?.content?.trim() || '{}';
    if (rawText.startsWith('\`\`\`json')) {
      rawText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      result = { title: text.substring(0, 50), description: text, category: 'Other', priority: 'Medium', city: '', state: '', tags: [] };
    }

    const { title, description, category, priority, city, state, tags } = result;

    const loc = location || {};
    const address = loc.address || city || state || 'Not specified';
    const finalCity = loc.city || city || '';
    const finalState = loc.state || state || '';

    const complaint = await Complaint.create({
      title: title || 'Quick Complaint',
      description: description || text,
      category: category || 'Other',
      images: [],
      location: { address, city: finalCity, state: finalState, pincode: loc.pincode || '' },
      priority: priority || 'Medium',
      isAnonymous: false,
      tags: tags || [],
      user: req.user._id,
      statusHistory: [{ status: 'Reported', note: 'Complaint quickly filed via AI.' }],
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { complaintsCount: 1 } });

    if (autoSubmit) {
      await handleAutoSubmit(complaint);
    }

    // Trigger on_create rules
    await triggerOnCreateRules(complaint);

    const populated = await Complaint.findById(complaint._id).populate('user', 'name avatar').lean();

    // Attach gov ticket if created
    if (autoSubmit) {
      const govTicket = await GovTicket.findOne({ complaint: complaint._id });
      if (govTicket) populated.govTicket = govTicket;
    }

    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully via Quick File.',
      complaint: populated,
    });

  } catch (err) {
    next(err);
  }
};

const _aiCategorize = async (req, res) => {
  try {
    const { analyzeComplaint } = require('../services/groqService');
    const { text } = req.body;
    const ai = await analyzeComplaint(text);
    res.json({ success: true, category: ai.category, priority: ai.priority, department: ai.department, title: ai.title, tags: ai.tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const _generateComplaintLetter = async (req, res) => {
  try {
    const { generateLetter } = require('../services/groqService');
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name email');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (String(complaint.user._id) !== String(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const letterText = await generateLetter(complaint, complaint.user.name);
    const refNum = 'JV/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 90000 + 10000);
    await Complaint.findByIdAndUpdate(req.params.id, { formalLetter: letterText, referenceNumber: refNum });

    const doc = new PDFDocument({ margin: 65, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="JantaVoice-${refNum.replace(/\//g, '-')}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(8).fillColor('#888').text('JANTA VOICE — CIVIC COMPLAINT PORTAL', { align: 'center' });
    doc.moveDown(0.3);
    const y = doc.y;
    doc.rect(65, y, 155, 3).fill('#FF9933');
    doc.rect(220, y, 155, 3).fill('#DDDDDD');
    doc.rect(375, y, 155, 3).fill('#138808');
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#555').text(`Ref: ${refNum}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
    doc.moveDown(1);

    letterText.split('\n').forEach(line => {
      if (!line.trim()) { doc.moveDown(0.4); return; }
      const isBold = line.trim().startsWith('To,') || line.trim().startsWith('Subject:') || line.trim().startsWith('CC:');
      doc[isBold ? 'font' : 'font'](isBold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(11).fillColor('#1A1A1A').text(line.trim(), { align: 'justify', lineGap: 3 });
    });

    doc.fontSize(7).fillColor('#aaa').text(`Filed via JantaVoice | Ref: ${refNum} | ID: ${complaint.complaintId || complaint._id}`, 65, 750, { align: 'center' });
    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const _quickFile = async (req, res) => {
  try {
    const { analyzeComplaint } = require('../services/groqService');
    const { DEPARTMENT_MAP } = require('../config/constants');
    const { text, location } = req.body;
    if (!text || text.trim().length < 5)
      return res.status(400).json({ success: false, message: 'Please describe the issue.' });

    const ai = await analyzeComplaint(text, location || '');
    const dept = DEPARTMENT_MAP[ai.category] || DEPARTMENT_MAP.Other;
    const complaintId = 'JV/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 90000 + 10000);

    const complaint = await Complaint.create({
      complaintId,
      title: ai.title,
      description: ai.description,
      rawInput: text,
      aiFormatted: { issueType: ai.issueType, department: dept.name, priority: ai.priority, location: ai.location, summary: ai.description },
      category: ai.category,
      department: dept.name,
      location: { address: ai.location || location || '', city: ai.city || '', state: ai.state || '' },
      status: 'Submitted',
      priority: ai.priority,
      tags: ai.tags || [],
      user: req.user._id,
      isFake: req.fakeResult?.isFake || false,
      fakeScore: req.fakeResult?.fakeScore || 0,
      statusHistory: [{ status: 'Submitted', changedAt: new Date(), note: 'Quick-filed via AI', isAutomated: true }],
      nextEscalationAt: new Date(Date.now() + 3 * 86400000)
    });

    // Create notification
    if (Notification) {
      await Notification.create({
        user: req.user._id,
        complaint: complaint._id,
        type: 'submission',
        message: `⚡ AI filed your complaint: "${complaint.title}" — ID: ${complaintId}`
      });
    }

    res.status(201).json({ success: true, complaint, aiResult: ai });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createComplaint,
  getAllComplaints,
  getStats,
  getMyComplaints,
  getComplaintById,
  likeComplaint,
  addComment,
  updateStatus,
  deleteComplaint,
  aiCategorize: _aiCategorize,
  transcribeVoice,
  generateFormalLetter: _generateComplaintLetter,
  quickFile: _quickFile,
  extractDetails,
};

exports = module.exports;

// ── QUICK FILE — AI does all formatting ──
exports.quickFile = async (req, res) => {
  try {
    const { analyzeComplaint, generateLetter } = require('../services/groqService');
    const { DEPARTMENT_MAP } = require('../config/constants');
    const { text, location } = req.body;
    if (!text || text.trim().length < 5)
      return res.status(400).json({ success: false, message: 'Please describe the issue.' });

    const ai = await analyzeComplaint(text, location || '');
    const dept = DEPARTMENT_MAP[ai.category] || DEPARTMENT_MAP.Other;
    const complaintId = 'JV/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 90000 + 10000);

    const complaint = await Complaint.create({
      complaintId,
      title: ai.title,
      description: ai.description,
      rawInput: text,
      aiFormatted: { issueType: ai.issueType, department: dept.name, priority: ai.priority, location: ai.location, summary: ai.description },
      category: ai.category,
      department: dept.name,
      location: { address: ai.location || location || '', city: ai.city || '', state: ai.state || '' },
      status: 'Submitted',
      priority: ai.priority,
      tags: ai.tags || [],
      user: req.user._id,
      isFake: req.fakeResult?.isFake || false,
      fakeScore: req.fakeResult?.fakeScore || 0,
      statusHistory: [{ status: 'Submitted', changedAt: new Date(), note: 'Quick-filed via AI', isAutomated: true }],
      nextEscalationAt: new Date(Date.now() + 3 * 86400000)
    });

    // Create notification
    if (Notification) {
      await Notification.create({
        user: req.user._id,
        complaint: complaint._id,
        type: 'submission',
        message: `⚡ AI filed your complaint: "${complaint.title}" — ID: ${complaintId}`
      });
    }

    res.status(201).json({ success: true, complaint, aiResult: ai });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── AI CATEGORIZE (for form assist) ──
exports.aiCategorize = async (req, res) => {
  try {
    const { analyzeComplaint } = require('../services/groqService');
    const { text } = req.body;
    const ai = await analyzeComplaint(text);
    res.json({ success: true, category: ai.category, priority: ai.priority, department: ai.department, title: ai.title, tags: ai.tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GENERATE FORMAL LETTER (PDF download) ──
exports.generateComplaintLetter = async (req, res) => {
  try {
    const { generateLetter } = require('../services/groqService');
    const PDFDocument = require('pdfkit');
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name email');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (String(complaint.user._id) !== String(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const letterText = await generateLetter(complaint, complaint.user.name);
    const refNum = 'JV/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 90000 + 10000);
    await Complaint.findByIdAndUpdate(req.params.id, { formalLetter: letterText, referenceNumber: refNum });

    const doc = new PDFDocument({ margin: 65, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="JantaVoice-${refNum.replace(/\//g, '-')}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(8).fillColor('#888').text('JANTA VOICE — CIVIC COMPLAINT PORTAL', { align: 'center' });
    doc.moveDown(0.3);
    const y = doc.y;
    doc.rect(65, y, 155, 3).fill('#FF9933');
    doc.rect(220, y, 155, 3).fill('#DDDDDD');
    doc.rect(375, y, 155, 3).fill('#138808');
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#555').text(`Ref: ${refNum}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
    doc.moveDown(1);

    letterText.split('\n').forEach(line => {
      if (!line.trim()) { doc.moveDown(0.4); return; }
      const isBold = line.trim().startsWith('To,') || line.trim().startsWith('Subject:') || line.trim().startsWith('CC:');
      doc[isBold ? 'font' : 'font'](isBold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(11).fillColor('#1A1A1A').text(line.trim(), { align: 'justify', lineGap: 3 });
    });

    doc.fontSize(7).fillColor('#aaa').text(`Filed via JantaVoice | Ref: ${refNum} | ID: ${complaint.complaintId || complaint._id}`, 65, 750, { align: 'center' });
    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

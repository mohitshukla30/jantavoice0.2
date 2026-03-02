const path = require('path');
const fs = require('fs');
const os = require('os');
const PDFDocument = require('pdfkit');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const GovTicket = require('../models/GovTicket');
const { groq, autoCategory, generateAdminNote } = require('../config/groq');

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

// POST /api/complaints/:id/generate-letter
const generateComplaintLetter = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const isOwner = complaint.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to generate letter.' });
    }

    const { title, description, category, location } = complaint;
    const userName = req.body.userName || req.user.name;
    const userEmail = req.body.userEmail || req.user.email;
    const additionalDetails = req.body.additionalDetails || 'None';

    const systemPrompt = `You are an expert Indian government document writer. Generate a formal complaint letter in proper Indian government format. The letter must include:
1. Proper salutation to the concerned government department
2. Subject line (RE: Formal Complaint Regarding [category])
3. Reference number placeholder: JV/[YEAR]/[RANDOM_5_DIGITS]
4. Date in DD/MM/YYYY format
5. Body paragraphs: introduction, detailed description of issue, impact on citizens, previous actions taken (if any), specific demands/requests
6. Formal closing with complainant details
7. CC line to relevant departments
Use formal English style. Keep it under 400 words.
Return ONLY a valid JSON object matching exactly this structure: {"letterText": "string", "subject": "string", "referenceNumber": "string", "department": "string", "ccList": "string"}`;

    const userPrompt = `Complaint Details:
Title: ${title}
Description: ${description}
Category: ${category}
Address: ${location.address}, ${location.city}, ${location.state}
Complainant Name: ${userName}
Complainant Email: ${userEmail}
Additional Details (Previous actions): ${additionalDetails}`;

    const chat = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 1000,
    });

    let generatedData;
    let rawText = '';
    try {
      rawText = chat.choices[0]?.message?.content?.trim();
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON brackets found in AI response');
      }

      const jsonText = rawText.substring(jsonStart, jsonEnd);
      generatedData = JSON.parse(jsonText);
    } catch (e) {
      console.error('AI Letter Gen Error:', e.message);
      console.error('Raw AI Output:', rawText);
      return res.status(500).json({ success: false, message: 'Failed to generate proper letter format via AI.', rawError: e.message, rawText });
    }

    const { letterText, subject, referenceNumber, department, ccList } = generatedData;

    complaint.formalLetter = letterText || 'Sample formal letter text.';
    complaint.referenceNumber = referenceNumber || `JV/AUTO/${Math.random().toString().slice(2, 8)}`;
    complaint.letterGeneratedAt = new Date();
    await complaint.save();

    const safeRef = (complaint.referenceNumber).replace(/[\/\\]/g, '-');
    const docPath = path.join(os.tmpdir(), `complaint-${complaint._id}-${Date.now()}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(docPath);
    doc.pipe(writeStream);

    doc.font('Helvetica-Bold').fontSize(16).text('JANTA VOICE COMPLAINT PORTAL', { align: 'center' });
    doc.moveDown(0.2);

    const startX = 50;
    const lineY = doc.y;
    const lineWidth = doc.page.width - 100;
    doc.rect(startX, lineY, lineWidth, 2).fill('#FF9933');
    doc.rect(startX, lineY + 2, lineWidth, 2).fill('#138808');
    doc.moveDown(1.5);
    doc.fillColor('black');

    doc.font('Helvetica-Bold').fontSize(12).text(`Ref: ${referenceNumber}`, { continued: true });
    const today = new Date().toLocaleDateString('en-IN');
    doc.text(`Date: ${today}`, { align: 'right' });
    doc.moveDown();

    doc.font('Helvetica-Bold').text(`To,`);
    doc.text(department || 'Concerned Authority');
    doc.moveDown();

    doc.font('Helvetica-Bold').text(`Subject: ${subject}`);
    doc.moveDown();

    doc.font('Helvetica').text(letterText, { align: 'justify' });
    doc.moveDown(2);

    if (ccList) {
      doc.font('Helvetica-Bold').text('CC:');
      doc.font('Helvetica').text(ccList);
    }

    doc.moveDown(3);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('gray').text(`Filed via Janta Voice | jantavoice.com | Ref: ${referenceNumber || `JV/AUTO/${Math.random().toString().slice(2, 8)}`}`, { align: 'center', baseline: 'bottom' });

    doc.end();

    writeStream.on('finish', () => {
      res.download(docPath, `${safeRef}.pdf`, (err) => {
        if (err) console.error(err);
        setTimeout(() => { if (fs.existsSync(docPath)) fs.unlinkSync(docPath); }, 60000);
      });
    });

  } catch (err) {
    next(err);
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
  aiCategorize,
  transcribeVoice,
  generateComplaintLetter,
};

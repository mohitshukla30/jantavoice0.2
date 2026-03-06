const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 500, trim: true },
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [150, 'Title cannot exceed 150 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Safety', 'Noise', 'Other'],
  },
  images: [{ type: String }],
  location: {
    address: { type: String, required: [true, 'Address is required'], trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true, match: [/^\d{6}$/, 'Invalid pincode'] },
  },
  status: {
    type: String,
    enum: ['Reported', 'In Progress', 'Resolved', 'Rejected'],
    default: 'Reported',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isAnonymous: { type: Boolean, default: false },
  tags: [{ type: String, trim: true }],
  adminNote: { type: String, default: '', maxlength: 500 },
  aiSummary: { type: String, default: '' },
  views: { type: Number, default: 0 },
  rawInput: { type: String },
  aiFormatted: {
    issueType: String,
    department: String,
    priority: String,
    location: String,
    summary: String
  },
  department: { type: String },
  escalationLevel: { type: Number, default: 0 },
  nextEscalationAt: Date,
  isFake: { type: Boolean, default: false },
  fakeScore: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  govTicketId: { type: String },
  callLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'CallLog' },
  formalLetter: { type: String, default: '' },
  referenceNumber: { type: String, default: '' },
  letterGeneratedAt: { type: Date },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    isAutomated: { type: Boolean, default: false }
  }],
}, { timestamps: true });

// Indexes
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ user: 1 });
complaintSchema.index({ 'location.city': 1 });
complaintSchema.index({ title: 'text', description: 'text' });

// Virtual for likes count
complaintSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

module.exports = mongoose.model('Complaint', complaintSchema);

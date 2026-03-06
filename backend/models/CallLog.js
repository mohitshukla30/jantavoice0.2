const mongoose = require('mongoose');
const callLogSchema = new mongoose.Schema({
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetDepartment: { type: String, required: true },
    targetOfficer: { type: String, default: 'Duty Officer' },
    script: { type: String },        // AI-generated call script
    transcript: { type: String },        // conversation transcript
    status: {
        type: String,
        enum: ['Script Generated', 'Calling', 'Answered', 'No Answer', 'Completed', 'Failed'],
        default: 'Script Generated'
    },
    duration: { type: Number, default: 0 },  // seconds
    twilioCallSid: { type: String },        // for future Twilio integration
    recordingUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('CallLog', callLogSchema);

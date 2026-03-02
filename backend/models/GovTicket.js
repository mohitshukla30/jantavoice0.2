const mongoose = require('mongoose');

const govTicketSchema = new mongoose.Schema({
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    portal: { type: String, required: true },  // e.g. "CPGRAMS"
    portalName: { type: String },
    ticketId: { type: String },               // government-assigned ticket ID
    ticketUrl: { type: String },              // direct link to ticket on gov portal
    submittedAt: { type: Date },
    lastChecked: { type: Date },
    currentStatus: { type: String, default: 'Submitted' },
    statusHistory: [{
        status: String,
        details: String,
        timestamp: { type: Date, default: Date.now },
        source: String   // "auto_check" or "manual"
    }],
    govResponse: { type: String },            // official response text
    expectedResolutionDate: { type: Date },
    isResolved: { type: Boolean, default: false },
    checkCount: { type: Number, default: 0 },
    lastRawResponse: { type: String }         // store raw HTML/JSON for debugging
}, { timestamps: true });

govTicketSchema.index({ ticketId: 1 });
govTicketSchema.index({ user: 1 });
govTicketSchema.index({ complaint: 1 });

module.exports = mongoose.model('GovTicket', govTicketSchema);

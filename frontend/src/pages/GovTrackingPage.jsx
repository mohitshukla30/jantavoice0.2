import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, RefreshCw, ExternalLink, CheckCircle2, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { govAPI, complaintAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function GovTrackingPage() {
    const [tickets, setTickets] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    // Section 1 State
    const [selectedComplaintId, setSelectedComplaintId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Section 2 State
    const [manualTicketId, setManualTicketId] = useState('');
    const [manualPortal, setManualPortal] = useState('CPGRAMS');
    const [tracking, setTracking] = useState(false);

    // Expanded rows
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ticketsRes, complaintsRes] = await Promise.all([
                govAPI.getMyTickets(),
                complaintAPI.getMy()
            ]);
            setTickets(ticketsRes.data.tickets);
            setComplaints(complaintsRes.data.complaints);
        } catch (err) {
            toast.error('Failed to load tracking data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

    const handleAutoSubmit = async () => {
        if (!selectedComplaintId) return toast.error('Please select a complaint');
        setSubmitting(true);
        try {
            const { data } = await govAPI.submit(selectedComplaintId);
            toast.success(data.message);
            setSelectedComplaintId('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit to government portal');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualTrack = async () => {
        if (!manualTicketId.trim()) return toast.error('Enter a ticket ID');
        setTracking(true);
        try {
            const { data } = await govAPI.trackManual({ ticketId: manualTicketId, portal: manualPortal });
            toast.success('Ticket tracked successfully!');
            setManualTicketId('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tracking failed');
        } finally {
            setTracking(false);
        }
    };

    const handleCheckStatus = async (ticketId) => {
        try {
            toast.loading('Checking status...', { id: 'check' });
            await govAPI.checkStatus(ticketId);
            toast.success('Status updated!', { id: 'check' });
            fetchData();
        } catch (err) {
            toast.error('Failed to update status', { id: 'check' });
        }
    };

    const unsubmittedComplaints = complaints.filter(c => !tickets.some(t => t.complaint?._id === c._id));

    if (loading) {
        return <div className="p-8 flex justify-center py-20 w-full"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 px-4 sm:px-0 py-4 md:py-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-3xl p-8 border border-border shadow-sm mb-6 flex flex-col relative overflow-hidden group"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-white to-primary opacity-50" />
                <div className="absolute -right-32 -top-32 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/10 transition-colors duration-700" />

                <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-foreground flex items-center gap-3 tracking-tight mb-2">
                        <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-2xl">
                            <Building2 className="w-8 h-8" />
                        </div>
                        Gov Portal Tracker
                    </h1>
                    <p className="text-base text-muted-foreground font-medium max-w-2xl">
                        Auto-submit to external portals or manually track official government grievance tickets directly from Janta Voice.
                    </p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SECTION 1: Auto Submit Bento */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col justify-between group">
                    <div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight mb-2 flex items-center gap-2">
                            <span className="p-2 bg-success/10 text-success rounded-xl"><Building2 size={20} /></span>
                            Auto-Submit Portal
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground mb-6">We map your complaint to the right state portal and track it automatically.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider opacity-80">Select Complaint</label>
                                <select
                                    value={selectedComplaintId}
                                    onChange={(e) => setSelectedComplaintId(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-sm appearance-none cursor-pointer"
                                >
                                    <option value="">-- Unsubmitted Complaints --</option>
                                    {unsubmittedComplaints.map(c => (
                                        <option key={c._id} value={c._id}>{c.title} ({c.category})</option>
                                    ))}
                                </select>
                                {unsubmittedComplaints.length === 0 && (
                                    <p className="text-xs text-success mt-3 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> All reports submitted!</p>
                                )}
                            </div>

                             {selectedComplaintId && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-success/5 border border-success/20 rounded-2xl p-4 flex items-start gap-4">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-border text-primary">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-success text-sm mb-1">State Portal Bound</p>
                                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">AI has selected the optimal portal based on issue category.</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleAutoSubmit}
                        disabled={!selectedComplaintId || submitting}
                        className={`btn w-full py-4 mt-6 flex items-center justify-center gap-2 font-bold rounded-2xl transition-all ${submitting || !selectedComplaintId ? 'bg-secondary text-muted-foreground cursor-not-allowed border border-border' : 'bg-success text-success-foreground shadow-lg shadow-success/20 hover:scale-[1.02]'}`}
                    >
                        {submitting ? <Loader className="animate-spin w-5 h-5" /> : 'Confirm Submission'}
                    </button>
                </motion.div>

                {/* SECTION 2: Manual Track Bento */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col justify-between group">
                    <div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight mb-2 flex items-center gap-2">
                            <span className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Search size={20} /></span>
                            Manual Tracker
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground mb-6">Track tickets filed externally by entering the ID and Portal Name.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider opacity-80">Grievance Ticket ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. MH20240401"
                                    value={manualTicketId}
                                    onChange={(e) => setManualTicketId(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all uppercase font-semibold text-sm placeholder-muted-foreground"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider opacity-80">Gov Portal</label>
                                <select
                                    value={manualPortal}
                                    onChange={(e) => setManualPortal(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-sm appearance-none cursor-pointer"
                                >
                                    <option value="CPGRAMS">CPGRAMS (Central)</option>
                                    <option value="Maharashtra_CRZ">Aaple Sarkar (MH)</option>
                                    <option value="Swachhata">Swachhata App</option>
                                    <option value="Delhi_CM">Delhi CM</option>
                                    <option value="Other">Other Municipality</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleManualTrack}
                        disabled={!manualTicketId.trim() || tracking}
                        className={`btn w-full py-4 mt-6 flex items-center justify-center gap-2 font-bold rounded-2xl transition-all ${tracking || !manualTicketId.trim() ? 'bg-secondary text-muted-foreground cursor-not-allowed border border-border' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:scale-[1.02]'}`}
                    >
                        {tracking ? <Loader className="animate-spin w-5 h-5" /> : 'Fetch Status'}
                    </button>
                </motion.div>
            </div>

            {/* SECTION 3: My Active Gov Tickets */}
            <div className="glass-card rounded-3xl overflow-hidden mt-8">
                <div className="p-6 border-b border-border bg-secondary/30">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">My Active Gov Tickets</h2>
                </div>

                {tickets.length === 0 ? (
                    <div className="p-16 text-center text-muted-foreground font-medium">
                        <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30 text-primary" />
                        <p>No government tickets tracked yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/50 border-b border-border text-xs uppercase text-muted-foreground font-bold tracking-wider">
                                    <th className="p-5">Complaint</th>
                                    <th className="p-5">Portal & Ticket ID</th>
                                    <th className="p-5">Gov Status</th>
                                    <th className="p-5">Last Checked</th>
                                    <th className="p-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(ticket => (
                                    <React.Fragment key={ticket._id}>
                                        <tr className="border-b border-border hover:bg-secondary/30 transition-colors group">
                                            <td className="p-5">
                                                <p className="font-bold text-foreground text-sm truncate max-w-xs">{ticket.complaint?.title || 'Unknown Complaint'}</p>
                                                <p className="text-xs text-muted-foreground font-medium mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="font-bold text-primary text-sm">{ticket.portalName}</p>
                                                <p className="text-xs font-mono text-muted-foreground font-semibold bg-secondary px-2 py-1 rounded inline-block mt-1">{ticket.ticketId}</p>
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${ticket.isResolved ? 'bg-green-500/10 text-green-600' : 'bg-primary/10 text-primary'}`}>
                                                    {ticket.currentStatus}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-xs font-medium text-foreground">{ticket.lastChecked ? formatDistanceToNow(new Date(ticket.lastChecked), { addSuffix: true }) : 'Never'}</p>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{ticket.checkCount} checks</p>
                                            </td>
                                            <td className="p-5 text-right space-x-2">
                                                <button
                                                    onClick={() => handleCheckStatus(ticket._id)}
                                                    className="w-8 h-8 inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                                    title="Check Now"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                                <a
                                                    href={ticket.ticketUrl || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 inline-flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-xl transition-colors"
                                                    title="Open Portal"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                                <button
                                                    onClick={() => toggleRow(ticket._id)}
                                                    className="w-8 h-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                                                >
                                                    {expandedRows.has(ticket._id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                        {/* EXPANDED TIMELINE */}
                                        {expandedRows.has(ticket._id) && (
                                            <tr className="bg-secondary/30 border-b border-border">
                                                <td colSpan="5" className="p-6">
                                                    <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                                                        <RefreshCw size={14} className="text-muted-foreground" /> Government Action Timeline
                                                    </h4>
                                                    <div className="space-y-4 pl-3 border-l-2 border-border ml-2">
                                                        {ticket.statusHistory?.map((hw, idx) => (
                                                            <div key={idx} className="relative pl-6">
                                                                <div className="absolute -left-[23.5px] top-1 bg-background border-2 border-primary w-4 h-4 rounded-full"></div>
                                                                <p className="text-xs font-bold text-muted-foreground mb-1">{new Date(hw.timestamp).toLocaleString()}</p>
                                                                <p className="text-sm font-bold text-foreground">{hw.status}</p>
                                                                <div className="bg-background border border-border p-4 rounded-xl mt-2 text-sm text-muted-foreground shadow-sm relative">
                                                                    <div className="absolute -left-[5px] top-4 w-2 h-2 bg-background border-l border-t border-border rotate-[-45deg]"></div>
                                                                    <span className="font-serif italic font-medium">"{hw.details}"</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

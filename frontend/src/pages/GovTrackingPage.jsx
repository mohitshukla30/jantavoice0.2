import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { complaintAPI, govAPI } from '../services/api';
import GovStatusBadge from '../components/GovStatusBadge';
import { FaBuilding, FaSearch, FaSync, FaExternalLinkAlt, FaInfoCircle, FaPaperPlane, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { timeAgo, formatDate } from '../utils/helpers';

export default function GovTrackingPage() {
    const { isAuthenticated, user } = useAuth();
    const [unsubmittedComplaints, setUnsubmittedComplaints] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedComplaintId, setSelectedComplaintId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);

    const [manualTicketId, setManualTicketId] = useState('');
    const [manualPortal, setManualPortal] = useState('');
    const [trackingManual, setTrackingManual] = useState(false);

    const portals = [
        { id: 'CPGRAMS', name: 'CPGRAMS (Central)' },
        { id: 'MGNREGA', name: 'MGNREGA Portal' },
        { id: 'Maharashtra_CRZ', name: 'Aaple Sarkar (MH)' },
        { id: 'Delhi_CM', name: 'Delhi CM Helpline' },
        { id: 'Swachhata', name: 'Swachhata App' }
    ];

    const fetchData = async () => {
        if (!isAuthenticated) return;
        try {
            setLoading(true);
            const [ticketsRes, complaintsRes] = await Promise.all([
                govAPI.getMyTickets(),
                complaintAPI.getMy()
            ]);
            setMyTickets(ticketsRes.data.tickets);

            const ticketComplaintIds = ticketsRes.data.tickets.filter(t => t.complaint).map(t => t.complaint._id || t.complaint);
            const unsubmitted = complaintsRes.data.complaints.filter(c => !ticketComplaintIds.includes(c._id));
            setUnsubmittedComplaints(unsubmitted);
        } catch (err) {
            toast.error('Failed to load tracking data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isAuthenticated]);

    const handleAutoSubmit = async () => {
        if (!selectedComplaintId) return toast.error('Please select a complaint');
        setSubmitting(true);
        setSubmitResult(null);
        try {
            const { data } = await govAPI.submit(selectedComplaintId);
            setSubmitResult(data);
            toast.success(data.message);
            fetchData(); // refresh lists
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualTrack = async (e) => {
        e.preventDefault();
        if (!manualTicketId || !manualPortal) return toast.error('Fill required fields');
        setTrackingManual(true);
        try {
            await govAPI.trackManual({ ticketId: manualTicketId, portal: manualPortal });
            toast.success('Ticket tracked successfully!');
            setManualTicketId('');
            setManualPortal('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to track ticket');
        } finally {
            setTrackingManual(false);
        }
    };

    const checkStatus = async (ticketId, ticketOid) => {
        // Optimistic UI loading state could be added here
        toast.loading('Checking status...', { id: 'statusCheck' });
        try {
            const { data } = await govAPI.checkStatus(ticketId);
            setMyTickets(prev => prev.map(t => t._id === ticketOid ? data.ticket : t));
            toast.success('Status updated', { id: 'statusCheck' });
        } catch (err) {
            toast.error('Could not check status', { id: 'statusCheck' });
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="pt-24 min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Please log in to track government tickets.</p>
            </div>
        );
    }

    return (
        <div className="pt-20 min-h-screen bg-gray-50 pb-12">
            <div className="max-w-6xl mx-auto px-4 py-8">

                <div className="mb-8">
                    <h1 className="font-heading font-bold text-3xl mb-2 flex items-center gap-3">
                        <FaBuilding className="text-blue-600" />
                        Government <span className="text-saffron">Portal Tracking</span>
                    </h1>
                    <p className="text-gray-600 max-w-2xl">
                        Janta Voice bridges the gap between citizens and government. Auto-submit your complaints to official public grievance portals, or track existing tickets in one unified dashboard.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* SECTION 1: Auto Submit */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg"><FaPaperPlane /></div>
                            <div>
                                <h2 className="font-heading font-bold text-lg">Auto-Submit Complaint</h2>
                                <p className="text-xs text-gray-500">Send to official government portal</p>
                            </div>
                        </div>

                        {submitResult ? (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl"><FaCheckCircle /></div>
                                <h3 className="font-bold text-green-800 mb-1">Submitted Successfully</h3>
                                <p className="text-sm text-green-700 mb-4">Ticket ID: <span className="font-mono font-bold">{submitResult.ticketId}</span></p>
                                <div className="text-xs text-green-600 bg-white p-2 border border-green-100 rounded mb-4">
                                    Sent to: {submitResult.portal}
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <a href={submitResult.trackingUrl} target="_blank" rel="noreferrer" className="btn-green text-xs py-2 px-4 inline-flex items-center gap-1">
                                        View on Portal <FaExternalLinkAlt />
                                    </a>
                                    <button onClick={() => setSubmitResult(null)} className="btn-secondary text-xs py-2 px-4">Submit Another</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2 border border-blue-100">
                                    <FaInfoCircle className="mt-0.5 shrink-0" />
                                    We automatically select the correct government portal based on your complaint's category and state.
                                </div>

                                <div>
                                    <label className="label">Select your existing Janta Voice complaint</label>
                                    <select
                                        className="input"
                                        value={selectedComplaintId}
                                        onChange={e => setSelectedComplaintId(e.target.value)}
                                        disabled={unsubmittedComplaints.length === 0}
                                    >
                                        <option value="">-- Select a complaint snippet --</option>
                                        {unsubmittedComplaints.map(c => (
                                            <option key={c._id} value={c._id}>{c.title} ({c.category})</option>
                                        ))}
                                    </select>
                                    {unsubmittedComplaints.length === 0 && !loading && (
                                        <p className="text-xs text-amber-600 mt-1">You have no pending complaints. Track existing or file a new one.</p>
                                    )}
                                </div>

                                <button
                                    onClick={handleAutoSubmit}
                                    disabled={!selectedComplaintId || submitting}
                                    className="btn-primary w-full py-2.5 flex justify-center items-center gap-2 mt-2"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaBuilding />}
                                    🏛️ Submit to Government Portal
                                </button>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: Manual Track */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg"><FaSearch /></div>
                            <div>
                                <h2 className="font-heading font-bold text-lg">Track Existing Ticket</h2>
                                <p className="text-xs text-gray-500">Already filed? Check status here</p>
                            </div>
                        </div>

                        <form onSubmit={handleManualTrack} className="space-y-4">
                            <div>
                                <label className="label">Government Portal / Department</label>
                                <select className="input" value={manualPortal} onChange={e => setManualPortal(e.target.value)} required>
                                    <option value="">-- Select Portal --</option>
                                    {portals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Grievance / Ticket ID</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. CPGRAMS/E/2024/..."
                                    value={manualTicketId}
                                    onChange={e => setManualTicketId(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={trackingManual || !manualPortal || !manualTicketId}
                                className="btn-secondary w-full py-2.5 flex justify-center items-center gap-2 mt-2"
                            >
                                {trackingManual ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                                Add to Tracking Dashboard
                            </button>
                        </form>
                    </div>
                </div>

                {/* SECTION 3: My Tickets Table */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-heading font-bold text-lg">My Government Tickets</h2>
                        <button onClick={fetchData} className="text-gray-500 hover:text-saffron transition-colors text-sm flex items-center gap-1">
                            <FaSync className={loading ? "animate-spin" : ""} /> Refresh List
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading tickets...</div>
                        ) : myTickets.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                                <FaBuilding className="text-4xl opacity-20 mb-3" />
                                <p>You aren't tracking any government tickets yet.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="px-5 py-3 rounded-tl-xl w-1/3">Complaint / Title</th>
                                        <th className="px-5 py-3">Portal Info</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3 text-right rounded-tr-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {myTickets.map(ticket => (
                                        <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4 w-1/3 min-w-[200px]">
                                                <p className="font-bold text-gray-800 break-words whitespace-normal line-clamp-2">
                                                    {ticket.complaint ? ticket.complaint.title : 'Manually Tracked Issue'}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">Submitted: {formatDate(ticket.submittedAt)}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-800">{ticket.portalName}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-1 shrink-0">{ticket.ticketId}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <GovStatusBadge status={ticket.currentStatus} />
                                                {ticket.govResponse && (
                                                    <div className="group relative ml-2 inline-block">
                                                        <FaInfoCircle className="text-gray-400 hover:text-blue-500 cursor-pointer" />
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-normal z-10 pointer-events-none">
                                                            {ticket.govResponse}
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-gray-400 mt-1.5">Checked {timeAgo(ticket.lastChecked)}</p>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => checkStatus(ticket.ticketId, ticket._id)}
                                                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                    >
                                                        <FaSync className="text-[10px]" /> Check
                                                    </button>
                                                    <a
                                                        href={ticket.ticketUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                    >
                                                        Portal <FaExternalLinkAlt className="text-[10px]" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-4">
                    Status updates are automatically checked every 4 hours system-wide.
                </p>

            </div>
        </div>
    );
}

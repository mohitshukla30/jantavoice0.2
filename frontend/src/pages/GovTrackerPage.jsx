import React, { useState, useEffect } from 'react';
import { complaintAPI, govAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function GovTrackerPage() {
    const [complaints, setComplaints] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Manual Tracking logic
    const [manualTicket, setManualTicket] = useState('');
    const [manualPortal, setManualPortal] = useState('cpgrams');
    const [trackResult, setTrackResult] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const cRes = await complaintAPI.getMy();
            const tRes = await govAPI.getMyTickets();
            setComplaints(cRes.data.complaints || []);
            setTickets(tRes.data.tickets || []);
        } catch {
            toast.error('Failed to load portal data');
        } finally {
            setLoading(false);
        }
    }

    async function handleAutoSubmit(complaintId) {
        const tId = toast.loading('Submitting to Gov Portal...');
        try {
            const { data } = await govAPI.submit(complaintId);
            if (data.success) {
                toast.success(`Success! Ticket ID: ${data.ticket.ticketId}`, { id: tId });
                fetchData();
            } else {
                toast.error(data.message, { id: tId });
            }
        } catch (err) {
            toast.error('Submission failed', { id: tId });
        }
    }

    async function handleManualTrack() {
        if (!manualTicket.trim()) return toast.error('Enter Ticket ID');
        const tId = toast.loading('Fetching Live Status...');
        try {
            const { data } = await govAPI.trackManual({ ticketId: manualTicket, portal: manualPortal });
            setTrackResult(data.currentStatus);
            toast.success('Found ticket status!', { id: tId });
            fetchData(); // updates the table above if new
        } catch {
            toast.error('Failed to locate ticket', { id: tId });
        }
    }

    async function handleRefresh(ticketId) {
        const tId = toast.loading('Checking portal...');
        try {
            await govAPI.check(ticketId);
            toast.success('Status updated', { id: tId });
            fetchData();
        } catch {
            toast.error('Failed to refresh status', { id: tId });
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 page-enter pt-10 pb-20">

            {/* HEADER */}
            <div className="glass p-8 rounded-3xl border border-white/60">
                <h1 className="text-4xl font-heading font-black text-gray-800 tracking-tight">🏛️ Portal Tracker</h1>
                <p className="text-gray-500 mt-2 font-medium">Link your JantaVoice complaints directly into CPGRAMS and Local Government silos.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                {/* SUBMIT WIDGET */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 text-9xl opacity-[0.03]">🏛️</div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🔗 Link a Complaint</h2>
                    <select id="comp-sel" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 font-bold text-gray-700">
                        <option value="">-- Select an unresolved complaint --</option>
                        {complaints.filter(c => !c.govTicketId && c.status !== 'Resolved').map(c => (
                            <option key={c._id} value={c._id}>{c.title}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            const val = document.getElementById('comp-sel').value;
                            if (val) handleAutoSubmit(val); else toast.error('Select a complaint first');
                        }}
                        className="w-full bg-saffron hover:bg-saffron-dark text-white font-bold py-3 rounded-xl transition-all shadow-md">
                        Submit to Government Portal →
                    </button>
                </div>

                {/* MANUAL TRACKING WIDGET */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🔍 Manual Track</h2>
                    <div className="flex gap-2 mb-4">
                        <select
                            value={manualPortal}
                            onChange={e => setManualPortal(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-700 w-1/3">
                            <option value="cpgrams">CPGRAMS (Central)</option>
                            <option value="maha">MahaOnline (MH)</option>
                            <option value="delhi">PGMS (Delhi)</option>
                        </select>
                        <input
                            value={manualTicket}
                            onChange={e => setManualTicket(e.target.value)}
                            placeholder="Enter Gov Ticket ID"
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex-1 focus:border-saffron focus:ring-1 focus:ring-saffron"
                        />
                    </div>
                    <button onClick={handleManualTrack} className="w-full bg-india-green hover:bg-india-green-dark text-white font-bold py-3 rounded-xl transition-all shadow-md">
                        Track Status
                    </button>

                    {trackResult && (
                        <div className="mt-4 p-4 rounded-xl border-l-4 border-india-green bg-green-50 animate-fade-in">
                            <h4 className="font-bold text-gray-800">{trackResult.status}</h4>
                            <p className="text-sm text-gray-600 mt-1">{trackResult.details}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* TICKET TABLE */}
            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">🎫 Active Gov Tickets</h3>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-400 text-xs uppercase font-black border-b border-gray-100">
                                <th className="p-4 rounded-tl-3xl">Ticket ID</th>
                                <th className="p-4">Linked Complaint</th>
                                <th className="p-4">Portal</th>
                                <th className="p-4">Live Status</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-8 text-gray-400 font-bold">Loading ticketing silo...</td></tr>
                            ) : tickets.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-8 text-gray-400 font-bold">No active government tickets found.</td></tr>
                            ) : tickets.map((t, idx) => (
                                <tr key={t._id} className={"border-b border-gray-50 hover:bg-gray-50/50 transition-colors " + (t.isResolved ? 'opacity-50' : '')}>
                                    <td className="p-4 font-mono font-bold text-gray-700">{t.ticketId}</td>
                                    <td className="p-4 text-sm font-bold text-gray-800">
                                        {t.complaint?.title || <span className="text-gray-400 italic">Unlinked / External</span>}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-gray-500 uppercase">{t.portalName}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.currentStatus === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                                                t.currentStatus === 'In Progress' ? 'bg-orange-100 text-orange-700' :
                                                    t.currentStatus === 'Disposed' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-700'
                                            }`}>
                                            {t.currentStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center space-x-2">
                                        <button onClick={() => handleRefresh(t._id)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" title="Sync Status">🔄</button>
                                        {t.trackUrl && (
                                            <button onClick={() => window.open(t.trackUrl)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" title="Open Portal URL">↗</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

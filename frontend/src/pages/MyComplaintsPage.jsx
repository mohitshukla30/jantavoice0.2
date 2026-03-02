import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusTimeline from '../components/StatusTimeline';
import ComplaintLetterGenerator from '../components/ComplaintLetterGenerator';
import { CATEGORY_ICONS, STATUS_COLORS, formatDate, timeAgo } from '../utils/helpers';
import { FaTrash, FaEye, FaFileAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function MyComplaintsPage() {
  const { isAuthenticated } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [activeLetterComplaint, setActiveLetterComplaint] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetch = async () => {
      try {
        const { data } = await complaintAPI.getMy();
        setComplaints(data.complaints);
      } catch { toast.error('Failed to load your complaints'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [isAuthenticated]);

  const filtered = complaints.filter(c => {
    if (tab === 'active') return c.status !== 'Resolved' && c.status !== 'Rejected';
    if (tab === 'resolved') return c.status === 'Resolved';
    if (tab === 'rejected') return c.status === 'Rejected';
    return true;
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this complaint?')) return;
    try {
      await complaintAPI.delete(id);
      setComplaints(prev => prev.filter(c => c._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Cannot delete'); }
  };

  const handleLetterGenerated = async () => {
    if (!activeLetterComplaint) return;
    try {
      const { data } = await complaintAPI.getById(activeLetterComplaint._id);
      setComplaints(prev => prev.map(c => c._id === data.complaint._id ? data.complaint : c));
      setActiveLetterComplaint(data.complaint);
    } catch { }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-3xl mb-1">My <span className="text-saffron">Complaints</span></h1>
        <p className="text-gray-500 text-sm mb-5">{complaints.length} complaint{complaints.length !== 1 ? 's' : ''} filed</p>

        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-5 shadow-sm">
          {[['all', 'All'], ['active', 'Active'], ['resolved', 'Resolved'], ['rejected', 'Rejected']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === val ? 'bg-saffron text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-saffron border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl opacity-30 mb-4">📂</div>
            <p className="text-gray-500 mb-4">{tab === 'all' ? "You haven't filed any complaints yet." : `No ${tab} complaints.`}</p>
            {tab === 'all' && <Link to="/report" className="btn-primary inline-flex">📢 File Your First Complaint</Link>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c._id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-saffron/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-snug">{c.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-400">
                      <span>{CATEGORY_ICONS[c.category]} {c.category}</span>
                      <span>📍 {c.location?.city || c.location?.address}</span>
                      <span>📅 {formatDate(c.createdAt)}</span>
                      <span>❤️ {c.likesCount || 0}</span>
                      <span>👁️ {c.views || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={STATUS_COLORS[c.status]}>{c.status}</span>
                    <div className="flex gap-1">
                      {c.govTicket && <span className="text-sm" title="Gov Ticket Active">🏛️</span>}
                      {c.referenceNumber && <span className="text-sm" title="Formal Letter Ready">📄</span>}
                      {c.statusHistory?.some(h => h.source === 'automation') && <span className="text-sm" title="Auto-Escalated">🤖</span>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => setActiveLetterComplaint(c)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 transition-colors tooltip-wrap" title="Generate Letter">
                        <FaFileAlt className="text-sm" />
                      </button>
                      <Link to={`/complaint/${c._id}`} className="w-8 h-8 bg-gray-100 hover:bg-saffron-pale rounded-lg flex items-center justify-center text-gray-500 hover:text-saffron transition-colors">
                        <FaEye className="text-sm" />
                      </Link>
                      <button onClick={() => handleDelete(c._id)} className="w-8 h-8 bg-gray-100 hover:bg-red-50 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
                <StatusTimeline statusHistory={c.statusHistory || []} currentStatus={c.status} />
                {c.adminNote && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 flex gap-2">
                    💬 <span><strong>Admin:</strong> {c.adminNote}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ComplaintLetterGenerator
        isOpen={!!activeLetterComplaint}
        onClose={() => setActiveLetterComplaint(null)}
        complaint={activeLetterComplaint}
        onGenerated={handleLetterGenerated}
      />
    </div>
  );
}

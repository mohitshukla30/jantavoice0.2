import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_ICONS, STATUS_COLORS, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUSES = ['Reported', 'In Progress', 'Resolved', 'Rejected'];

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [updates, setUpdates] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      toast.error('Admin access required');
      navigate('/feed');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [filters, page]);

  const fetchStats = async () => {
    try {
      const { data } = await complaintAPI.getStats();
      setStats(data.stats);
    } catch { }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const { data } = await complaintAPI.getAll(params);
      setComplaints(data.complaints);
      setTotal(data.total);
      setPages(data.pages);
    } catch { toast.error('Failed to fetch complaints'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = (id, field, val) => {
    setUpdates(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const generateAINote = async (complaint) => {
    const upd = updates[complaint._id] || {};
    const status = upd.status || complaint.status;
    setAiGenerating(complaint._id);
    try {
      const { data } = await complaintAPI.updateStatus(complaint._id, { status, autoGenerateNote: true });
      const newNote = data.complaint.adminNote;
      setUpdates(prev => ({ ...prev, [complaint._id]: { ...prev[complaint._id], adminNote: newNote } }));
      toast.success('🤖 AI note generated!');
    } catch { toast.error('AI note failed'); }
    finally { setAiGenerating(null); }
  };

  const saveStatus = async (complaint) => {
    const upd = updates[complaint._id] || {};
    if (!upd.status && !upd.adminNote) { toast('No changes to save'); return; }
    setSavingId(complaint._id);
    try {
      await complaintAPI.updateStatus(complaint._id, {
        status: upd.status || complaint.status,
        adminNote: upd.adminNote || complaint.adminNote,
      });
      toast.success('✅ Updated');
      setComplaintsRow(complaint._id, upd);
      setUpdates(prev => { const n = { ...prev }; delete n[complaint._id]; return n; });
      fetchStats();
    } catch { toast.error('Update failed'); }
    finally { setSavingId(null); }
  };

  const setComplaintsRow = (id, upd) => {
    setComplaints(prev => prev.map(c => c._id === id ? { ...c, ...upd } : c));
  };

  const statCards = stats ? [
    { label: 'Total', val: stats.total, icon: '📋', color: 'text-ashoka-light border-ashoka-light', bg: 'bg-ashoka-pale' },
    { label: 'Reported', val: stats.reported, icon: '🔴', color: 'text-red-600 border-red-300', bg: 'bg-red-50' },
    { label: 'In Progress', val: stats.inProgress, icon: '⚙️', color: 'text-amber-600 border-amber-300', bg: 'bg-amber-50' },
    { label: 'Resolved', val: stats.resolved, icon: '✅', color: 'text-india-green border-india-green', bg: 'bg-india-green-pale' },
  ] : [];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-3xl">Admin <span className="text-saffron">Dashboard</span></h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage and respond to all complaints</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
          {stats ? statCards.map(s => (
            <div key={s.label} className={`bg-white border rounded-2xl p-4 shadow-sm border-l-4 ${s.color.split(' ')[1]}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`font-heading font-bold text-3xl ${s.color.split(' ')[0]}`}>{s.val}</div>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          )) : [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="h-6 w-8 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Feature Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats ? [
            { label: 'Gov Tickets Submitted', val: stats.govTickets, icon: '🏛️' },
            { label: 'Auto-actions Today', val: stats.autoActionsToday, icon: '🤖' },
            { label: 'Letters Generated', val: stats.lettersGen, icon: '📄' }
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="text-2xl">{s.icon}</div>
              <div>
                <div className="font-bold text-gray-800 text-lg leading-none">{s.val}</div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mt-1">{s.label}</div>
              </div>
            </div>
          )) : null}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
            <h3 className="font-heading font-bold text-lg">Complaint Management</h3>
            <div className="flex gap-2 flex-wrap">
              <input
                className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-saffron transition-colors w-52"
                placeholder="🔍 Search..."
                value={filters.search}
                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              />
              <select
                className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-saffron"
                value={filters.status}
                onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
              >
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Admin Note + AI</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Save</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      {[1, 2, 3, 4, 5, 6, 7].map(j => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full" /></td>)}
                    </tr>
                  ))
                ) : complaints.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No complaints found</td></tr>
                ) : complaints.map(c => {
                  const upd = updates[c._id] || {};
                  const curStatus = upd.status || c.status;
                  return (
                    <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-semibold text-gray-800 text-xs line-clamp-2">{c.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">👤 {c.user?.name || 'Anon'} · ❤️ {c.likes?.length || 0}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-saffron-pale text-saffron-dark text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {CATEGORY_ICONS[c.category]} {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                        {c.location?.city || c.location?.address?.slice(0, 20) || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={curStatus}
                          onChange={e => handleStatusChange(c._id, 'status', e.target.value)}
                          className="border-2 border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-saffron w-28"
                        >
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex gap-1 items-center">
                          <input
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-44 focus:outline-none focus:border-saffron"
                            value={upd.adminNote !== undefined ? upd.adminNote : (c.adminNote || '')}
                            onChange={e => handleStatusChange(c._id, 'adminNote', e.target.value)}
                            placeholder="Add note..."
                          />
                          <button
                            onClick={() => generateAINote(c)}
                            disabled={aiGenerating === c._id}
                            className="text-[10px] bg-ashoka-pale text-ashoka hover:bg-ashoka/10 px-2 py-1 rounded-lg font-bold transition-colors disabled:opacity-60 whitespace-nowrap"
                            title="Generate AI note"
                          >
                            {aiGenerating === c._id ? '⏳' : '🤖 AI'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => saveStatus(c)}
                          disabled={savingId === c._id}
                          className="bg-saffron hover:bg-saffron-dark text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {savingId === c._id ? '...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="p-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-400 text-xs">{total} total complaints</span>
              <div className="flex gap-1">
                {Array.from({ length: pages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${page === i + 1 ? 'bg-saffron text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

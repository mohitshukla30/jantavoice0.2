import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ComplaintCard from '../components/ComplaintCard';
import ComplaintSkeleton from '../components/ComplaintSkeleton';
import { CATEGORY_ICONS } from '../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Safety', 'Noise', 'Other'];

export default function FeedPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState({ category: '', status: '', sortBy: 'newest', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const { isAuthenticated } = useAuth();

  const fetchComplaints = useCallback(async (pg = 1, reset = true) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page: pg, limit: 12 };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.sortBy !== 'newest') params.sortBy = filters.sortBy;
      if (filters.search) params.search = filters.search;

      const { data } = await complaintAPI.getAll(params);
      if (reset || pg === 1) {
        setComplaints(data.complaints);
      } else {
        setComplaints(prev => [...prev, ...data.complaints]);
      }
      setTotal(data.total);
      setHasMore(pg < data.pages);
      setPage(pg);
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => { fetchComplaints(1, true); }, [fetchComplaints]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setCategory = (cat) => setFilters(f => ({ ...f, category: cat === 'All' ? '' : cat }));

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-3xl"><span className="text-saffron">Complaints</span> Feed</h1>
            {!loading && <p className="text-sm text-gray-500 mt-1">{total} complaint{total !== 1 ? 's' : ''} found</p>}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 shadow-sm space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 border-2 border-gray-200 focus-within:border-saffron rounded-xl px-3 py-2 flex-1 min-w-[200px] transition-colors">
              <span className="text-gray-400">🔍</span>
              <input
                className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                placeholder="Search complaints..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && <button onClick={() => setSearchInput('')} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>}
            </div>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 bg-white focus:outline-none focus:border-saffron"
            >
              <option value="">All Status</option>
              <option value="Reported">Reported</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select
              value={filters.sortBy}
              onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 bg-white focus:outline-none focus:border-saffron"
            >
              <option value="newest">⏰ Newest</option>
              <option value="likes">❤️ Most Liked</option>
              <option value="views">👁️ Most Viewed</option>
              <option value="oldest">📅 Oldest</option>
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${(cat === 'All' && !filters.category) || filters.category === cat
                    ? 'bg-saffron border-saffron text-white'
                    : 'border-gray-200 text-gray-500 hover:border-saffron hover:text-saffron'
                  }`}
              >
                {cat !== 'All' ? `${CATEGORY_ICONS[cat]} ` : ''}{cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar ext-gray-700">
          <Link to="/report?tab=voice" className="flex-shrink-0 bg-white border border-gray-200 hover:border-saffron hover:text-saffron-dark px-4 py-2.5 rounded-xl shadow-sm transition-all font-bold text-sm flex items-center gap-2">
            🎤 Voice Complaint
          </Link>
          <Link to="/my-complaints" className="flex-shrink-0 bg-white border border-gray-200 hover:border-saffron hover:text-saffron-dark px-4 py-2.5 rounded-xl shadow-sm transition-all font-bold text-sm flex items-center gap-2">
            📄 Generate Letter
          </Link>
          <Link to="/gov-tracking" className="flex-shrink-0 bg-white border border-gray-200 hover:border-saffron hover:text-saffron-dark px-4 py-2.5 rounded-xl shadow-sm transition-all font-bold text-sm flex items-center gap-2">
            🏛️ Gov Tracker
          </Link>
          <button onClick={() => toast.success('Alerts configured!')} className="flex-shrink-0 bg-white border border-gray-200 hover:border-saffron hover:text-saffron-dark px-4 py-2.5 rounded-xl shadow-sm transition-all font-bold text-sm flex items-center gap-2">
            🔔 Set Alert
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <ComplaintSkeleton key={i} />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-40">📭</div>
            <h3 className="font-heading font-bold text-xl text-gray-600 mb-2">No complaints found</h3>
            <p className="text-gray-400 text-sm mb-5">
              {filters.search || filters.category || filters.status
                ? 'Try adjusting your filters'
                : 'Be the first to file a complaint in your area'}
            </p>
            {isAuthenticated
              ? <Link to="/report" className="btn-primary inline-flex">📢 File First Complaint</Link>
              : <Link to="/register" className="btn-primary inline-flex">Join Janta Voice</Link>
            }
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {complaints.map(c => (
                <ComplaintCard key={c._id} complaint={c} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchComplaints(page + 1, false)}
                  disabled={loadingMore}
                  className="btn-secondary px-8"
                >
                  {loadingMore ? 'Loading...' : 'Load More Complaints'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <Link to="/report" className="fixed bottom-6 right-6 w-14 h-14 bg-saffron hover:bg-saffron-dark text-white text-3xl rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-40 font-light">
        +
      </Link>
    </div>
  );
}

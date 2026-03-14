import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Heart, Eye, MessageSquare, ChevronDown, Plus,
  Mic, FileText, MapPin, Bell, Inbox, Loader2, SlidersHorizontal,
  X, TrendingUp, Zap, BarChart3, ChevronRight
} from 'lucide-react';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ComplaintCard from '../components/ComplaintCard';
import ComplaintSkeleton from '../components/ComplaintSkeleton';
import { CATEGORY_ICONS } from '../utils/helpers';
import toast from 'react-hot-toast';

/* ─── constants ─── */
const CATEGORIES = ['All', 'Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Safety', 'Noise', 'Other'];

const SORT_OPTIONS = [
  { val: 'newest', label: 'Newest First' },
  { val: 'likes',  label: 'Most Liked'  },
  { val: 'views',  label: 'Most Viewed' },
  { val: 'oldest', label: 'Oldest First' },
];

const STATUS_OPTIONS = [
  { val: '',            label: 'All Status'  },
  { val: 'Reported',   label: 'Reported'    },
  { val: 'In Progress',label: 'In Progress' },
  { val: 'Resolved',   label: 'Resolved'    },
];

const QUICK_ACTIONS = [
  { icon: Mic,      label: 'Voice Report',   link: '/report?tab=voice' },
  { icon: FileText, label: 'Generate Letter', link: '/my-complaints'   },
  { icon: MapPin,   label: 'Gov Tracker',    link: '/gov-tracking'    },
  { icon: Bell,     label: 'Set Alert',      action: () => toast.success('Alerts configured!') },
];

/* ─── animation presets ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── small helpers ─── */
function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-2">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none pl-4 pr-9 py-2.5 bg-secondary/50 border border-border rounded-2xl text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all cursor-pointer"
        >
          {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function FeedPage() {
  const { isAuthenticated } = useAuth();

  const [complaints, setComplaints]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [filters, setFilters]           = useState({ category: '', status: '', sortBy: 'newest', search: '' });
  const [searchInput, setSearchInput]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);

  /* ── fetch ── */
  const fetchComplaints = useCallback(async (pg = 1, reset = true) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page: pg, limit: 12 };
      if (filters.category)            params.category = filters.category;
      if (filters.status)              params.status   = filters.status;
      if (filters.sortBy !== 'newest') params.sortBy   = filters.sortBy;
      if (filters.search)              params.search   = filters.search;

      const { data } = await complaintAPI.getAll(params);
      setComplaints(prev => (reset || pg === 1) ? data.complaints : [...prev, ...data.complaints]);
      setTotal(data.total);
      setHasMore(pg < data.pages);
      setPage(pg);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => { fetchComplaints(1, true); }, [fetchComplaints]);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput })), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setCategory = (cat) => setFilters(f => ({ ...f, category: cat === 'All' ? '' : cat }));

  const activeFiltersCount = [filters.category, filters.status, filters.sortBy !== 'newest' ? filters.sortBy : ''].filter(Boolean).length;

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

        {/* ── hero header ── */}
        <motion.div {...fadeUp(0)} className="relative bg-card dark:bg-zinc-900 rounded-3xl p-7 sm:p-9 mb-7 overflow-hidden shadow-sm dark:shadow-2xl border border-border dark:border-white/[0.06]">
          {/* texture — visible only in dark */}
          <div className="absolute inset-0 opacity-0 dark:opacity-[0.035] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
          {/* top accent line for light mode */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/60 via-primary to-primary/20 dark:hidden" />
          {/* glow blobs */}
          <div className="absolute -top-10 -right-10 w-56 h-56 bg-primary/10 dark:bg-primary/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-14 left-6 w-44 h-44 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/35 mb-2">Community Feed</p>
              <h1 className="text-4xl lg:text-5xl font-black text-foreground dark:text-white tracking-tight leading-none mb-3">
                Complaints <span className="text-primary">Feed</span>
              </h1>
              <p className="text-muted-foreground dark:text-white/45 font-medium text-sm flex items-center gap-2">
                <MapPin size={13} className="text-primary" />
                {loading ? '—' : `${total} complaint${total !== 1 ? 's' : ''} reported in your area`}
              </p>
            </div>

            {/* header actions */}
            <div className="flex items-center gap-3 shrink-0">
              <motion.button
                onClick={() => setShowFilters(v => !v)}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
                  showFilters
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                    : 'bg-secondary dark:bg-white/[0.08] text-foreground dark:text-white border-border dark:border-white/[0.15] hover:bg-secondary/70 dark:hover:bg-white/[0.14]'
                }`}
              >
                <SlidersHorizontal size={15} />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center border-2 border-card dark:border-zinc-900">
                    {activeFiltersCount}
                  </span>
                )}
              </motion.button>

              <Link
                to="/report"
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-2xl transition-all shadow-lg shadow-primary/30"
              >
                <Plus size={15} /> Report
              </Link>
            </div>
          </div>

          {/* quick actions strip */}
          <div className="relative z-10 flex gap-2 mt-7 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
            {QUICK_ACTIONS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="shrink-0"
              >
                {item.link ? (
                  <Link
                    to={item.link}
                    className="flex items-center gap-2 bg-secondary dark:bg-white/[0.08] hover:bg-secondary/70 dark:hover:bg-white/[0.14] border border-border dark:border-white/[0.12] text-muted-foreground dark:text-white/70 hover:text-foreground dark:hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    <item.icon size={13} className="text-primary" />
                    {item.label}
                  </Link>
                ) : (
                  <button
                    onClick={item.action}
                    className="flex items-center gap-2 bg-secondary dark:bg-white/[0.08] hover:bg-secondary/70 dark:hover:bg-white/[0.14] border border-border dark:border-white/[0.12] text-muted-foreground dark:text-white/70 hover:text-foreground dark:hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    <item.icon size={13} className="text-primary" />
                    {item.label}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── filter panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pb-5">
                <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    {/* search */}
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-2">Search</p>
                      <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                        <input
                          className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-2xl text-sm font-medium text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                          placeholder="Search by title, category, area…"
                          value={searchInput}
                          onChange={e => setSearchInput(e.target.value)}
                        />
                        {searchInput && (
                          <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <SelectField
                      label="Status"
                      value={filters.status}
                      onChange={v => setFilters(f => ({ ...f, status: v }))}
                      options={STATUS_OPTIONS}
                    />
                    <SelectField
                      label="Sort By"
                      value={filters.sortBy}
                      onChange={v => setFilters(f => ({ ...f, sortBy: v }))}
                      options={SORT_OPTIONS}
                    />
                  </div>

                  {/* category pills */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-3">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat, i) => {
                        const active = (cat === 'All' && !filters.category) || filters.category === cat;
                        return (
                          <motion.button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.025 }}
                            className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                                : 'bg-secondary border-border text-foreground hover:border-primary/30 hover:text-primary'
                            }`}
                          >
                            {cat}
                          </motion.button>
                        );
                      })}

                      {activeFiltersCount > 0 && (
                        <button
                          onClick={() => { setFilters({ category: '', status: '', sortBy: 'newest', search: '' }); setSearchInput(''); }}
                          className="px-4 py-2 rounded-2xl text-sm font-bold text-muted-foreground border border-border hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-all flex items-center gap-1.5"
                        >
                          <X size={13} /> Clear all
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── results meta bar ── */}
        {!loading && complaints.length > 0 && (
          <motion.div {...fadeUp(0.05)} className="flex items-center justify-between mb-5">
            <p className="text-sm text-muted-foreground font-semibold flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              Showing <span className="text-foreground font-bold">{complaints.length}</span> of <span className="text-foreground font-bold">{total}</span>
            </p>
            {(filters.category || filters.status) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                {filters.category && (
                  <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold">
                    {filters.category}
                    <button onClick={() => setFilters(f => ({ ...f, category: '' }))}><X size={10} /></button>
                  </span>
                )}
                {filters.status && (
                  <span className="flex items-center gap-1 bg-secondary border border-border px-2.5 py-1 rounded-full font-bold text-foreground">
                    {filters.status}
                    <button onClick={() => setFilters(f => ({ ...f, status: '' }))}><X size={10} /></button>
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── grid ── */}
        {loading ? (
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.div key={i} variants={itemVariants}><ComplaintSkeleton /></motion.div>
            ))}
          </motion.div>
        ) : complaints.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-card border border-border rounded-3xl flex flex-col items-center justify-center max-w-xl mx-auto"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-5"
            >
              <Inbox size={64} strokeWidth={1} className="mx-auto text-muted-foreground/25" />
            </motion.div>
            <h3 className="font-bold text-xl text-foreground tracking-tight mb-2">No complaints found</h3>
            <p className="text-muted-foreground font-medium text-sm mb-7 max-w-xs leading-relaxed">
              {filters.search || filters.category || filters.status
                ? 'Try adjusting your search or filters.'
                : 'Be the first to file a complaint in your area.'}
            </p>
            {isAuthenticated
              ? <Link to="/report" className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/25">
                  <Plus size={15} /> File First Complaint
                </Link>
              : <Link to="/register" className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/25">
                  Join Janta Voice <ChevronRight size={15} />
                </Link>
            }
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10"
            >
              {complaints.map(c => (
                <motion.div key={c._id} variants={itemVariants}>
                  <ComplaintCard complaint={c} />
                </motion.div>
              ))}
            </motion.div>

            {hasMore && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <motion.button
                  onClick={() => fetchComplaints(page + 1, false)}
                  disabled={loadingMore}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 bg-card border border-border hover:border-primary/30 text-foreground font-bold px-8 py-3 rounded-2xl text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  {loadingMore
                    ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} /></motion.div> Loading…</>
                    : <><TrendingUp size={15} className="text-primary" /> Load More</>
                  }
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ── FAB — mobile only (header has Report btn on sm+) ── */}
      <motion.div
        className="fixed bottom-6 right-6 z-40 sm:hidden"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
      >
        <Link
          to="/report"
          className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/40 flex items-center justify-center transition-all"
        >
          <Plus size={24} />
        </Link>
      </motion.div>
    </div>
  );
}
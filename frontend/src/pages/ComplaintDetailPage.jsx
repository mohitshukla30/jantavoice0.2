import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Download, Eye, Trash2, ExternalLink, Loader,
  ArrowLeft, Phone, Bot, MapPin, Calendar, Building2, RefreshCw, X,
  CheckCircle2, FileText, ChevronLeft, ChevronRight, Share2, Flag,
  Clock, TrendingUp, Shield, Zap
} from 'lucide-react';
import { complaintAPI, govAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusTimeline from '../components/StatusTimeline';
import GovStatusBadge from '../components/GovStatusBadge';
import CallPermissionModal from '../components/CallPermissionModal';
import CallTranscriptViewer from '../components/CallTranscriptViewer';
import { CATEGORY_ICONS, STATUS_COLORS, timeAgo, formatDate, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

/* ─── tiny helpers ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
});

const PriorityConfig = {
  Critical: { bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive', label: 'Critical' },
  High:     { bg: 'bg-orange-500/10',  text: 'text-orange-500',  dot: 'bg-orange-500',  label: 'High'     },
  Medium:   { bg: 'bg-blue-500/10',    text: 'text-blue-500',    dot: 'bg-blue-500',    label: 'Medium'   },
  Low:      { bg: 'bg-green-500/10',   text: 'text-green-500',   dot: 'bg-green-500',   label: 'Low'      },
};

/* ─── sub-components ─── */
function StatPill({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 bg-secondary/60 border border-border/60 rounded-2xl px-4 py-2.5">
      <Icon size={14} className="text-primary" />
      <span className="text-sm font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground font-medium hidden sm:inline">{label}</span>
    </div>
  );
}

function SectionCard({ children, className = '' }) {
  return (
    <div className={`glass-card rounded-3xl p-6 sm:p-7 ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">
      {children}
    </p>
  );
}

/* ─── image carousel ─── */
function ImageCarousel({ images, category }) {
  const [idx, setIdx] = useState(0);
  const base = 'https://jantavoice0-2.onrender.com';

  if (!images?.length) {
    return (
      <div className="relative aspect-[16/7] bg-gradient-to-br from-secondary/60 to-secondary/20 border border-border rounded-3xl flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="text-muted-foreground/20 mb-3">
          <FileText size={56} strokeWidth={1} />
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground/40">{category}</p>
        <p className="text-[10px] mt-1 text-muted-foreground/30 font-medium">No photos attached</p>
      </div>
    );
  }

  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);

  return (
    <div className="relative rounded-3xl overflow-hidden group">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={`${base}${images[idx]}`}
          alt={`Complaint image ${idx + 1}`}
          className="w-full aspect-[16/7] object-cover"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.35 }}
        />
      </AnimatePresence>

      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />

      {images.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-md border border-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-background">
            <ChevronLeft size={16} className="text-foreground" />
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-md border border-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-background">
            <ChevronRight size={16} className="text-foreground" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`rounded-full transition-all duration-300 ${i === idx ? 'w-6 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        </>
      )}

      {/* thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-0 right-3 bottom-3 flex gap-1.5">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-10 h-7 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-primary shadow-lg shadow-primary/30' : 'border-transparent opacity-60 hover:opacity-100'}`}>
              <img src={`${base}${img}`} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── main page ─── */
export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [downloadingLetter, setDownloadingLetter] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callLogId, setCallLogId] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [statusChecking, setStatusChecking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await complaintAPI.getById(id);
        setComplaint(data.complaint);
        setLiked(data.complaint.isLiked);
        setLikesCount(data.complaint.likesCount);
        if (data.complaint.callLogId) setCallLogId(data.complaint.callLogId);
      } catch {
        toast.error('Complaint not found');
        navigate('/feed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleLike = async () => {
    if (!isAuthenticated) { toast.error('Please login to like'); return; }
    try {
      const { data } = await complaintAPI.like(id);
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch { toast.error('Failed'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      const { data } = await complaintAPI.comment(id, comment);
      setComplaint(p => ({ ...p, comments: data.comments }));
      setComment('');
      toast.success('Comment added');
    } catch { toast.error('Failed to comment'); }
    finally { setCommenting(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this complaint?')) return;
    try {
      await complaintAPI.delete(id);
      toast.success('Complaint deleted');
      navigate('/my-complaints');
    } catch { toast.error('Cannot delete'); }
  };

  const handleLetterDownload = async () => {
    setDownloadingLetter(true);
    const toastId = toast.loading('🤖 AI is drafting your letter...');
    try {
      const res = await complaintAPI.generateLetter(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'complaint-letter.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Letter downloaded!', { id: toastId });
      const { data } = await complaintAPI.getById(id);
      setComplaint(data.complaint);
    } catch {
      toast.error('Failed to generate letter', { id: toastId });
    } finally {
      setDownloadingLetter(false);
    }
  };

  const handleCheckStatus = async () => {
    setStatusChecking(true);
    const tid = toast.loading('Checking status...');
    try {
      await govAPI.checkStatus(complaint.govTicket.ticketId || complaint.govTicket);
      const { data } = await complaintAPI.getById(id);
      setComplaint(data.complaint);
      toast.success('Status updated', { id: tid });
    } catch {
      toast.error('Check failed', { id: tid });
    } finally {
      setStatusChecking(false);
    }
  };

  /* ── loading ── */
  if (loading) return (
    <div className="pt-20 min-h-screen bg-background flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader size={36} className="text-primary" />
      </motion.div>
    </div>
  );
  if (!complaint) return null;

  const isOwner = user?.id === complaint.user?._id || user?._id === complaint.user?._id;
  const isAdmin = user?.role === 'admin';
  const priority = PriorityConfig[complaint.priority] || PriorityConfig.Low;

  return (
    <div className="pt-16 min-h-screen bg-background">

      {/* ── sticky top nav bar ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <motion.button
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-semibold transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </motion.button>

          {/* pill badges */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className={`${STATUS_COLORS[complaint.status]} text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap`}>
              {complaint.status}
            </span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap ${priority.bg} ${priority.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {priority.label} Priority
            </span>
          </div>

          {/* actions */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.88 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                liked
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-secondary text-muted-foreground border-border hover:border-primary/30 hover:text-primary'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
              {likesCount}
            </motion.button>
            {(isOwner || isAdmin) && (
              <motion.button
                onClick={handleDelete}
                whileTap={{ scale: 0.88 }}
                className="p-1.5 rounded-full bg-secondary hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors border border-border"
              >
                <Trash2 size={13} />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* ── page body ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 items-start">

          {/* ════ LEFT COLUMN ════ */}
          <div className="space-y-5 min-w-0">

            {/* image */}
            <motion.div {...fadeUp(0)}>
              <ImageCarousel images={complaint.images} category={complaint.category} />
            </motion.div>

            {/* title + meta */}
            <motion.div {...fadeUp(0.05)}>
              <SectionCard>
                {/* category pill */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    {CATEGORY_ICONS[complaint.category]}
                    {complaint.category}
                  </span>
                  {complaint.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="bg-secondary text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>

                <h1 className="font-black text-2xl sm:text-3xl leading-tight text-foreground tracking-tight mb-5">
                  {complaint.title}
                </h1>

                {/* location + date row */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary shrink-0" />
                    {[complaint.location?.address, complaint.location?.city, complaint.location?.state].filter(Boolean).join(', ')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary shrink-0" />
                    {formatDate(complaint.createdAt)}
                  </span>
                </div>

                {/* AI summary */}
                {complaint.aiSummary && (
                  <div className="relative bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/15 rounded-2xl p-4 mb-6 overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-[0.06] pointer-events-none">
                      <Bot size={72} />
                    </div>
                    <div className="flex gap-3 items-start relative">
                      <div className="w-7 h-7 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary mb-1">AI Summary</p>
                        <p className="text-sm text-foreground leading-relaxed">{complaint.aiSummary}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-base text-muted-foreground leading-relaxed font-medium">
                  {complaint.description}
                </p>
              </SectionCard>
            </motion.div>

            {/* stats strip */}
            <motion.div {...fadeUp(0.1)}>
              <div className="flex gap-3 flex-wrap">
                <StatPill icon={Eye} value={complaint.views} label="views" />
                <StatPill icon={MessageCircle} value={complaint.comments?.length || 0} label="comments" />
                <StatPill icon={Heart} value={likesCount} label="likes" />
                {complaint.referenceNumber && (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-2.5">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span className="text-xs font-bold text-green-600">{complaint.referenceNumber}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* admin note */}
            {complaint.adminNote && (
              <motion.div {...fadeUp(0.12)}>
                <div className="bg-secondary/50 border border-border rounded-3xl p-5">
                  <SectionLabel>📌 Admin Note</SectionLabel>
                  <p className="text-sm text-foreground font-medium leading-relaxed">{complaint.adminNote}</p>
                </div>
              </motion.div>
            )}

            {/* comments */}
            <motion.div {...fadeUp(0.15)}>
              <SectionCard>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg text-foreground tracking-tight">
                    Comments
                    <span className="ml-2 text-sm font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {complaint.comments?.length || 0}
                    </span>
                  </h3>
                </div>

                {isAuthenticated ? (
                  <form onSubmit={handleComment} className="flex gap-3 mb-6">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 shadow-sm">
                      {getInitials(user?.name || 'U')}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        className="input flex-1 bg-secondary/50 border-border rounded-2xl text-sm"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Share your thoughts…"
                        maxLength={500}
                      />
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        disabled={!comment.trim() || commenting}
                        className="btn btn-primary px-5 text-sm rounded-2xl disabled:opacity-50"
                      >
                        {commenting ? <Loader size={14} className="animate-spin" /> : 'Post'}
                      </motion.button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-secondary/50 border border-border rounded-2xl p-4 mb-5 text-sm text-center text-muted-foreground font-medium">
                    <Link to="/login" className="text-primary font-bold hover:underline">Login</Link> to join the conversation
                  </div>
                )}

                <div className="space-y-4">
                  {!complaint.comments?.length && (
                    <div className="text-center py-10 text-muted-foreground/50">
                      <MessageCircle size={32} className="mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-medium">No comments yet. Be the first!</p>
                    </div>
                  )}
                  {complaint.comments?.map((c, i) => (
                    <motion.div
                      key={c._id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 shadow-sm">
                        {getInitials(c.user?.name || 'A')}
                      </div>
                      <div className="flex-1 bg-secondary/40 border border-border/60 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold text-foreground">{c.user?.name || 'Anonymous'}</span>
                          <span className="text-[11px] font-semibold text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{c.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div className="space-y-4 lg:sticky lg:top-[72px]">

            {/* status timeline */}
            <motion.div {...fadeUp(0.08)}>
              <SectionCard>
                <SectionLabel>⚡ Status Progress</SectionLabel>
                <StatusTimeline statusHistory={complaint.statusHistory} currentStatus={complaint.status} />
              </SectionCard>
            </motion.div>

            {/* filed by */}
            <motion.div {...fadeUp(0.12)}>
              <SectionCard>
                <SectionLabel>Filed By</SectionLabel>
                {complaint.isAnonymous ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                      <Shield size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Anonymous</p>
                      <p className="text-xs text-muted-foreground font-medium">Identity hidden</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
                      {getInitials(complaint.user?.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{complaint.user?.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {complaint.user?.complaintsCount || 0} complaints filed
                      </p>
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Clock size={13} className="text-primary" />
                  Filed {formatDate(complaint.createdAt)}
                </div>
              </SectionCard>
            </motion.div>

            {/* automation panel — owner / admin only */}
            {(isOwner || isAdmin) && (
              <motion.div {...fadeUp(0.16)}>
                <div className="relative bg-card dark:bg-zinc-900 rounded-3xl p-6 overflow-hidden shadow-sm dark:shadow-xl border border-border dark:border-white/[0.06]">
                  {/* top accent — light mode */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/60 via-primary to-primary/20 dark:hidden" />
                  {/* bg glow */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                  {/* dot texture — dark only */}
                  <div className="absolute inset-0 opacity-0 dark:opacity-[0.025] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-7 h-7 rounded-xl bg-primary/10 dark:bg-white/10 flex items-center justify-center">
                        <Zap size={14} className="text-primary dark:text-white" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground dark:text-white/60">Automation Hub</p>
                    </div>

                    {/* status rows */}
                    <div className="space-y-2 mb-5">
                      {[
                        { label: 'Auto-monitoring', value: 'Active', valueClass: 'text-green-600 dark:text-green-400', dot: true },
                        {
                          label: 'Gov Submission',
                          value: complaint.govTicket
                            ? `GR#${complaint.govTicket.ticketId || complaint.govTicket.slice?.(-6) || ''}`
                            : 'Pending',
                          valueClass: complaint.govTicket ? 'text-green-600 dark:text-green-400' : 'text-primary',
                        },
                        { label: 'Next auto-check', value: 'in ~24 mins', valueClass: 'text-foreground dark:text-white/80' },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between items-center bg-secondary dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-xl px-3 py-2.5">
                          <span className="text-xs text-muted-foreground dark:text-white/50 font-medium">{row.label}</span>
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${row.valueClass}`}>
                            {row.dot && <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />}
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* formal letter */}
                    <div className="border-t border-border dark:border-white/10 pt-4 mb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground dark:text-white/40 mb-3">📄 Formal Letter</p>
                      <motion.button
                        onClick={handleLetterDownload}
                        disabled={downloadingLetter}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full text-sm py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-60 ${
                          complaint.referenceNumber
                            ? 'bg-secondary dark:bg-white/10 hover:bg-secondary/70 dark:hover:bg-white/15 text-foreground dark:text-white border border-border dark:border-white/15'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30'
                        }`}
                      >
                        {downloadingLetter
                          ? <><Loader size={15} className="animate-spin" /> {complaint.referenceNumber ? 'Downloading…' : 'Generating…'}</>
                          : complaint.referenceNumber
                            ? <><Download size={15} /> Download PDF</>
                            : <><FileText size={15} /> Generate Letter</>
                        }
                      </motion.button>
                    </div>

                    {/* call */}
                    <div className="border-t border-border dark:border-white/10 pt-4 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground dark:text-white/40 mb-3">📞 Automated Calling</p>
                      {!complaint.callLogId && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setShowCallModal(true)}
                          className="w-full bg-green-500 hover:bg-green-400 text-white text-sm py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-green-500/30"
                        >
                          <Phone size={15} /> Call Department via AI
                        </motion.button>
                      )}
                      {complaint.callLogId && (
                        <button
                          onClick={() => { setCallLogId(complaint.callLogId); setShowTranscript(true); }}
                          className="w-full bg-secondary dark:bg-white/10 hover:bg-secondary/70 dark:hover:bg-white/15 border border-border dark:border-white/15 text-foreground dark:text-white text-sm py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all"
                        >
                          📋 View Call Transcript
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* government ticket */}
            {complaint.govTicket && (
              <motion.div {...fadeUp(0.2)}>
                <SectionCard>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 size={14} className="text-primary" />
                    </div>
                    <SectionLabel>Government Ticket</SectionLabel>
                  </div>

                  {/* ticket id block */}
                  <div className="bg-secondary/60 border border-border rounded-2xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ticket ID</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black uppercase tracking-widest border border-primary/15">
                        {complaint.govTicket.portalName || 'CPGRAMS'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-mono text-base font-bold text-foreground">
                        {complaint.govTicket.ticketId || complaint.govTicket}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(complaint.govTicket.ticketId || complaint.govTicket);
                          toast.success('Copied!');
                        }}
                        className="text-primary bg-primary/10 hover:bg-primary/20 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <SectionLabel>Current Status</SectionLabel>
                    <GovStatusBadge status={complaint.govTicket.currentStatus || 'Submitted'} />
                  </div>

                  {complaint.govTicket.statusHistory?.length > 0 && (
                    <div className="border-t border-border pt-4 mb-4">
                      <SectionLabel>Progression</SectionLabel>
                      <div className="space-y-3">
                        {complaint.govTicket.statusHistory.slice(-3).map((h, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-foreground">{h.status}</p>
                              <p className="text-xs text-muted-foreground font-medium mt-0.5">{timeAgo(h.timestamp)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                    <a
                      href={complaint.govTicket.ticketUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-secondary hover:bg-primary/10 text-foreground hover:text-primary border border-border hover:border-primary/20 text-xs font-bold py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      Portal <ExternalLink size={12} />
                    </a>
                    <motion.button
                      onClick={handleCheckStatus}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn btn-secondary text-xs py-2.5 rounded-2xl flex items-center justify-center gap-1.5 font-bold"
                    >
                      <RefreshCw size={12} className={statusChecking ? 'animate-spin' : ''} /> Check Now
                    </motion.button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* admin quick actions */}
            {isAdmin && (
              <motion.div {...fadeUp(0.24)}>
                <SectionCard className="border border-primary/15 bg-primary/5">
                  <SectionLabel>🛡 Admin Actions</SectionLabel>
                  <Link
                    to="/admin"
                    className="btn btn-secondary w-full text-center text-sm py-3 rounded-2xl block font-bold"
                  >
                    Open Admin Panel
                  </Link>
                </SectionCard>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── call permission modal ── */}
      {showCallModal && (
        <CallPermissionModal
          complaint={complaint}
          onClose={() => setShowCallModal(false)}
          onCallStarted={(data) => {
            setCallLogId(data.callLogId);
            setShowCallModal(false);
            setShowTranscript(true);
          }}
        />
      )}

      {/* ── transcript modal ── */}
      <AnimatePresence>
        {showTranscript && callLogId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[1900] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 20 }}
              transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
              className="glass-card bg-background rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-border"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-0.5">Call Log</p>
                  <h2 className="font-bold text-xl text-foreground tracking-tight">📞 Call Details & Transcript</h2>
                </div>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="w-9 h-9 rounded-full bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <CallTranscriptViewer callLogId={callLogId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
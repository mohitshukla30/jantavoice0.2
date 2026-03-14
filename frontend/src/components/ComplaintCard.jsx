import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, Eye, MapPin, Flame, FileText, Settings, ChevronRight, Building2, Zap } from 'lucide-react';
import { timeAgo, getInitials, CATEGORY_ICONS } from '../utils/helpers';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/* ─── status accent config ─── */
const STATUS_ACCENT = {
  Resolved:    { bar: 'bg-green-500',     badge: 'bg-green-500/10 text-green-600 border-green-500/20',    dot: 'bg-green-500' },
  Rejected:    { bar: 'bg-destructive',   badge: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
  'In Progress':{ bar: 'bg-blue-500',    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',       dot: 'bg-blue-500' },
  Reported:    { bar: 'bg-primary',       badge: 'bg-primary/10 text-primary border-primary/20',           dot: 'bg-primary' },
};

const getStatusCfg = (s) => STATUS_ACCENT[s] || STATUS_ACCENT['Reported'];

export default function ComplaintCard({ complaint, onLikeUpdate }) {
  const { isAuthenticated, user } = useAuth();
  const [liked, setLiked]         = useState(complaint.likes?.includes(user?._id || user?.id));
  const [likesCount, setLikesCount] = useState(complaint.likesCount || complaint.likes?.length || 0);
  const [liking, setLiking]       = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { toast.error('Please login to like complaints'); return; }
    if (liking) return;
    setLiking(true);
    try {
      const { data } = await complaintAPI.like(complaint._id);
      setLiked(data.liked);
      setLikesCount(data.likesCount);
      onLikeUpdate?.(complaint._id, data);
    } catch { toast.error('Failed to update like'); }
    finally { setLiking(false); }
  };

  const cfg      = getStatusCfg(complaint.status);
  const isTrending = (complaint.likes?.length >= 10 || likesCount >= 10);

  return (
    <Link
      to={`/complaint/${complaint._id}`}
      className="block group relative overflow-hidden bg-card border border-border rounded-3xl transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
    >
      {/* top accent bar */}
      <div className={`h-[3px] w-full ${cfg.bar} opacity-70`} />

      <div className="p-5">
        {/* ── badges row ── */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {/* status */}
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {complaint.status}
            </span>

            {/* category */}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary border border-border text-foreground">
              {CATEGORY_ICONS[complaint.category] || CATEGORY_ICONS['Other']}
              {complaint.category}
            </span>

            {/* gov ticket */}
            {complaint.govTicket && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground" title="Gov Ticket Active">
                <Building2 size={10} className="text-primary" />
                GR#{complaint.govTicket.ticketId || complaint.govTicket.slice?.(-6)}
              </span>
            )}

            {/* formal letter */}
            {complaint.formalLetter && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground" title="Formal Letter Ready">
                <FileText size={10} className="text-primary" /> Letter
              </span>
            )}

            {/* auto-managed */}
            {complaint.statusHistory?.some(h => h.source === 'automation') && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600" title="Auto-managed">
                <Zap size={10} /> Auto
              </span>
            )}
          </div>

          {/* trending flame */}
          {isTrending && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <Flame size={11} className="animate-pulse" /> Hot
            </span>
          )}
        </div>

        {/* ── title + description ── */}
        <h3 className="font-bold text-foreground text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {complaint.title}
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-4">
          {complaint.description}
        </p>

        {/* ── location ── */}
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-4">
          <MapPin size={11} className="text-primary shrink-0" />
          <span className="truncate font-medium">
            {[complaint.location?.address, complaint.location?.city].filter(Boolean).join(', ')}
          </span>
        </div>

        {/* ── footer ── */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {/* avatar + name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0 shadow-sm">
              {getInitials(complaint.user?.name || 'A')}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-foreground truncate">{complaint.user?.name || 'Anonymous'}</p>
              <p className="text-[10px] text-muted-foreground">{timeAgo(complaint.createdAt)}</p>
            </div>
          </div>

          {/* stats */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-semibold shrink-0">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${liked ? 'text-primary' : 'hover:text-primary'} ${liking ? 'opacity-50' : ''}`}
            >
              <Heart size={13} fill={liked ? 'currentColor' : 'none'} className="transition-all" />
              {likesCount}
            </button>
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <MessageSquare size={13} /> {complaint.comments?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={13} /> {complaint.views || 0}
            </span>
          </div>
        </div>
      </div>

      {/* hover arrow */}
      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-1">
        <ChevronRight size={12} className="text-primary" />
      </div>
    </Link>
  );
}
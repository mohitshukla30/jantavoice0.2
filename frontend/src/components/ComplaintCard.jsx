import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaEye, FaMapMarkerAlt } from 'react-icons/fa';
import { timeAgo, CATEGORY_ICONS, CATEGORY_ACCENT, STATUS_COLORS, getInitials } from '../utils/helpers';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ComplaintCard({ complaint, onLikeUpdate }) {
  const { isAuthenticated, user } = useAuth();
  const [liked, setLiked] = useState(complaint.likes?.includes(user?._id || user?.id));
  const [likesCount, setLikesCount] = useState(complaint.likesCount || complaint.likes?.length || 0);
  const [liking, setLiking] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
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

  const accentColor = CATEGORY_ACCENT[complaint.category] || 'bg-gray-400';
  const icon = CATEGORY_ICONS[complaint.category] || '📋';

  return (
    <Link to={`/complaint/${complaint._id}`} className="card block group relative overflow-hidden">
      <div className={`h-1 w-full ${accentColor}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex gap-2 flex-wrap">
            <span className={STATUS_COLORS[complaint.status] || 'badge-reported'}>
              ● {complaint.status}
            </span>
            <span className="bg-saffron-pale text-saffron-dark text-xs font-bold px-2 py-1 rounded-full">
              {icon} {complaint.category}
            </span>
            {complaint.govTicket && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full" title="Gov Ticket Active">🏛️</span>}
            {complaint.statusHistory?.some(h => h.source === 'automation' && h.details?.includes('Escalate')) && (
              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">🤖 Auto-escalated</span>
            )}
          </div>
          {(complaint.likesCount > 20 || likesCount > 20) && (
            <span className="bg-gradient-to-r from-saffron to-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">🔥 Trending</span>
          )}
        </div>

        <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-saffron-dark transition-colors">{complaint.title}</h3>
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">{complaint.description}</p>

        <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
          <FaMapMarkerAlt className="text-saffron flex-shrink-0" />
          <span className="truncate">{complaint.location?.address}{complaint.location?.city ? `, ${complaint.location.city}` : ''}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-saffron to-saffron-dark flex items-center justify-center text-white text-[9px] font-bold">
              {getInitials(complaint.user?.name || 'A')}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">{complaint.user?.name || 'Anonymous'}</p>
              <p className="text-[10px] text-gray-400">{timeAgo(complaint.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <button onClick={handleLike} className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-500' : 'hover:text-red-400'}`}>
              {liked ? <FaHeart /> : <FaRegHeart />} {likesCount}
            </button>
            <span className="flex items-center gap-1"><FaComment className="text-gray-300" /> {complaint.comments?.length || 0}</span>
            <span className="flex items-center gap-1"><FaEye className="text-gray-300" /> {complaint.views || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

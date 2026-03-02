import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { complaintAPI, govAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusTimeline from '../components/StatusTimeline';
import ComplaintLetterGenerator from '../components/ComplaintLetterGenerator';
import GovStatusBadge from '../components/GovStatusBadge';
import { CATEGORY_ICONS, STATUS_COLORS, timeAgo, formatDate, getInitials } from '../utils/helpers';
import { FaHeart, FaRegHeart, FaArrowLeft, FaTrash, FaBuilding, FaExternalLinkAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

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
  const [imgIdx, setImgIdx] = useState(0);
  const [showLetterGen, setShowLetterGen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await complaintAPI.getById(id);
        setComplaint(data.complaint);
        setLiked(data.complaint.isLiked);
        setLikesCount(data.complaint.likesCount);
      } catch { toast.error('Complaint not found'); navigate('/feed'); }
      finally { setLoading(false); }
    };
    fetch();
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

  const handleLetterGenerated = async () => {
    try {
      const { data } = await complaintAPI.getById(id);
      setComplaint(data.complaint);
    } catch { }
  };

  if (loading) return (
    <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-saffron border-t-transparent rounded-full" />
    </div>
  );
  if (!complaint) return null;

  const isOwner = user?.id === complaint.user?._id || user?._id === complaint.user?._id;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-saffron font-semibold mb-5 transition-colors">
          <FaArrowLeft className="text-xs" /> Back
        </button>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Main */}
          <div className="md:col-span-2 space-y-4">
            {/* Image carousel or fallback */}
            {complaint.images?.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <img src={`http://localhost:5000${complaint.images[imgIdx]}`} alt="Complaint" className="w-full h-64 object-cover bg-gray-100" />
                {complaint.images.length > 1 && (
                  <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100">
                    {complaint.images.map((img, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-saffron ring-2 ring-saffron/20' : 'border-gray-200 hover:border-saffron/50'}`}>
                        <img src={`http://localhost:5000${img}`} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover bg-gray-100" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl h-64 flex flex-col items-center justify-center text-gray-400 shadow-inner">
                <div className="text-6xl mb-4 drop-shadow-sm">{CATEGORY_ICONS[complaint.category] || '📋'}</div>
                <p className="font-heading font-bold tracking-widest uppercase text-sm text-gray-500">{complaint.category}</p>
                <p className="text-xs mt-2 opacity-70">No photos attached</p>
              </div>
            )}

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={STATUS_COLORS[complaint.status]}>{complaint.status}</span>
                <span className="bg-saffron-pale text-saffron-dark text-xs font-bold px-2 py-1 rounded-full">
                  {CATEGORY_ICONS[complaint.category]} {complaint.category}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${complaint.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                  complaint.priority === 'High' ? 'bg-saffron-pale text-saffron-dark' :
                    complaint.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-india-green-pale text-india-green'
                  }`}>{complaint.priority} Priority</span>
              </div>
              <h1 className="font-heading font-bold text-2xl leading-tight mb-3">{complaint.title}</h1>
              {complaint.aiSummary && (
                <div className="bg-ashoka-pale border border-ashoka/20 rounded-xl p-3 mb-3 text-sm text-ashoka flex gap-2">
                  🤖 <span><strong>AI Summary:</strong> {complaint.aiSummary}</span>
                </div>
              )}
              <p className="text-gray-600 leading-relaxed text-sm mb-4">{complaint.description}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                📍 {complaint.location?.address}{complaint.location?.city ? `, ${complaint.location.city}` : ''}{complaint.location?.state ? `, ${complaint.location.state}` : ''}
              </div>
              {complaint.tags?.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {complaint.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${liked ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400 border border-transparent'}`}>
                  {liked ? <FaHeart /> : <FaRegHeart />} {likesCount} {liked ? 'Liked' : 'Like'}
                </button>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>👁️ {complaint.views} views</span>
                  <span>💬 {complaint.comments?.length || 0} comments</span>
                  {(isOwner || isAdmin) && (
                    <button onClick={handleDelete} className="text-red-400 hover:text-red-600 flex items-center gap-1">
                      <FaTrash /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Admin note */}
            {complaint.adminNote && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Admin Note</p>
                <p className="text-sm text-amber-800">{complaint.adminNote}</p>
              </div>
            )}

            {/* Comments */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-heading font-bold text-lg mb-4">Comments ({complaint.comments?.length || 0})</h3>
              {isAuthenticated ? (
                <form onSubmit={handleComment} className="flex gap-2 mb-5">
                  <input className="input flex-1" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." maxLength={500} />
                  <button disabled={!comment.trim() || commenting} className="btn-primary px-4 text-sm disabled:opacity-60">
                    {commenting ? '...' : 'Post'}
                  </button>
                </form>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-sm text-gray-500 text-center">
                  <Link to="/login" className="text-saffron-dark font-bold hover:underline">Login</Link> to add a comment
                </div>
              )}
              <div className="space-y-3">
                {complaint.comments?.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No comments yet. Be the first!</p>}
                {complaint.comments?.map(c => (
                  <div key={c._id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-saffron to-saffron-dark flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {getInitials(c.user?.name || 'A')}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-gray-700">{c.user?.name || 'Anonymous'}</span>
                        <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Status Progress</h4>
              <StatusTimeline statusHistory={complaint.statusHistory} currentStatus={complaint.status} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Filed By</h4>
              {complaint.isAnonymous ? (
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">👤</div><span className="text-sm font-semibold">Anonymous</span></div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saffron to-saffron-dark flex items-center justify-center text-white text-xs font-bold">{getInitials(complaint.user?.name)}</div>
                  <div><p className="text-sm font-bold">{complaint.user?.name}</p><p className="text-xs text-gray-400">{complaint.user?.complaintsCount || 0} complaints filed</p></div>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">📅 Filed {formatDate(complaint.createdAt)}</p>
            </div>

            {(isOwner || isAdmin) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Gov Integration</h4>
                {complaint.govTicket ? (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
                      <div className="text-xs text-blue-800 font-bold">
                        <FaBuilding className="inline mr-1" /> {complaint.govTicket.portalName}
                      </div>
                      <a href={complaint.govTicket.ticketUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800"><FaExternalLinkAlt className="text-xs" /></a>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">Ticket #: {complaint.govTicket.ticketId}</div>
                    <GovStatusBadge status={complaint.govTicket.currentStatus} />
                    <Link to="/gov-tracking" className="btn-secondary w-full text-center text-xs py-2 block">Track Details</Link>
                  </div>
                ) : (
                  <Link to="/gov-tracking" className="btn-primary w-full text-center text-sm py-2 flex justify-center items-center gap-2">
                    <FaBuilding /> Submit to Gov Portal
                  </Link>
                )}
              </div>
            )}

            {(isOwner || isAdmin) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Formal Document</h4>
                {complaint.referenceNumber ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-gray-800">Ref: {complaint.referenceNumber}</p>
                    <button onClick={() => setShowLetterGen(true)} className="btn-secondary w-full text-center text-sm py-2 flex items-center justify-center gap-2">
                      📄 View Letter
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowLetterGen(true)} className="btn-primary w-full text-center text-sm py-2 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 border-none">
                    📄 Generate Letter
                  </button>
                )}
              </div>
            )}

            {(isOwner || isAdmin) && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white border border-gray-700 rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-6xl">🤖</div>
                <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-400 mb-3 relative z-10 flex items-center gap-2">
                  Automation
                </h4>
                <div className="space-y-2 text-xs relative z-10">
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Auto-submit:</span>
                    <span className={complaint.govTicket ? "text-green-400 font-bold" : "text-amber-400 font-bold"}>
                      {complaint.govTicket ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Formal Letter:</span>
                    <span className={complaint.referenceNumber ? "text-green-400 font-bold" : "text-gray-500 font-bold"}>
                      {complaint.referenceNumber ? 'Generated' : 'Not yet'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Auto-escalation:</span>
                    <span className={complaint.priority === 'Critical' ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                      {complaint.statusHistory?.some(h => h.source === 'automation' && h.details?.includes('Escalate')) || complaint.priority === 'Critical' ? 'Active' : 'Monitoring'}
                    </span>
                  </div>
                  <div className="text-center pt-2 text-gray-500 font-mono text-[10px]">
                    System checks every 30m
                  </div>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Admin Actions</h4>
                <Link to="/admin" className="btn-primary w-full text-center text-sm py-2">Open Admin Panel</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComplaintLetterGenerator
        isOpen={showLetterGen}
        onClose={() => setShowLetterGen(false)}
        complaint={complaint}
        onGenerated={handleLetterGenerated}
      />
    </div>
  );
}

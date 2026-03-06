import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { complaintAPI, govAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusTimeline from '../components/StatusTimeline';
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
  const [downloadingLetter, setDownloadingLetter] = useState(false);

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

  const handleLetterDownload = async () => {
    setDownloadingLetter(true);
    const toastId = toast.loading('🤖 AI is drafting your letter...');
    try {
      const res = await complaintAPI.generateLetter(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `complaint-letter.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Letter downloaded!', { id: toastId });

      // Refresh to get referenceNumber 
      const { data } = await complaintAPI.getById(id);
      setComplaint(data.complaint);
    } catch (err) {
      toast.error('Failed to generate letter', { id: toastId });
    } finally {
      setDownloadingLetter(false);
    }
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
                <img src={`https://jantavoice0-2.onrender.com${complaint.images[imgIdx]}`} alt="Complaint" className="w-full h-64 object-cover bg-gray-100" />
                {complaint.images.length > 1 && (
                  <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100">
                    {complaint.images.map((img, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-saffron ring-2 ring-saffron/20' : 'border-gray-200 hover:border-saffron/50'}`}>
                        <img src={`https://jantavoice0-2.onrender.com${img}`} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover bg-gray-100" />
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
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${complaint.priority === 'Critical' ? 'bg-saffron text-white shadow-sm' :
                  complaint.priority === 'High' ? 'bg-saffron-pale text-saffron-dark' :
                    complaint.priority === 'Medium' ? 'bg-gray-200 text-gray-800' : 'bg-india-green-pale text-india-green-dark'
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
                <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${liked ? 'bg-saffron-pale text-saffron-dark border border-saffron/20' : 'bg-gray-100 text-gray-500 hover:bg-saffron-pale hover:text-saffron-dark border border-transparent'}`}>
                  {liked ? <FaHeart /> : <FaRegHeart />} {likesCount} {liked ? 'Liked' : 'Like'}
                </button>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>👁️ {complaint.views} views</span>
                  <span>💬 {complaint.comments?.length || 0} comments</span>
                  {(isOwner || isAdmin) && (
                    <button onClick={handleDelete} className="text-gray-400 hover:text-saffron-dark flex items-center gap-1">
                      <FaTrash /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Admin note */}
            {complaint.adminNote && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Admin Note</p>
                <p className="text-sm text-gray-800">{complaint.adminNote}</p>
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
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-4 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-6xl">🤖</div>
                <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-400 mb-3 relative z-10 flex items-center gap-2">
                  ⚡ Automation Status
                </h4>
                <div className="space-y-3 text-xs relative z-10">
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Auto-monitoring:</span>
                    <span className="flex items-center gap-1 text-india-green font-bold">
                      <span className="w-2 h-2 rounded-full bg-india-green animate-pulse"></span> Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Gov Submission:</span>
                    <span className={complaint.govTicket ? "text-india-green font-bold" : "text-saffron font-bold"}>
                      {complaint.govTicket ? `GR#${complaint.govTicket.ticketId || complaint.govTicket.slice(-6)}` : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Next auto-check:</span>
                    <span className="text-gray-300 font-bold">in ~24 mins</span>
                  </div>

                  <div className="pt-2 border-t border-gray-700 mt-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📄 Formal Letter</div>
                    {complaint.referenceNumber ? (
                      <button onClick={handleLetterDownload} disabled={downloadingLetter} className="btn-secondary w-full text-center text-xs py-2 flex items-center justify-center gap-2 border-gray-600 bg-gray-800 text-white hover:bg-gray-700 hover:text-white transition-colors">
                        {downloadingLetter ? 'Downloading...' : 'Download PDF'}
                      </button>
                    ) : (
                      <button onClick={handleLetterDownload} disabled={downloadingLetter} className="btn-primary w-full text-center text-xs py-2 flex items-center justify-center gap-2 border-none">
                        {downloadingLetter ? 'Generating...' : 'Generate Letter'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {complaint.govTicket && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h4 className="font-heading font-bold text-sm uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                  🏛️ Government Ticket
                </h4>

                <div className="space-y-3">
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Ticket ID</span>
                      <span className="text-[10px] text-gray-500 bg-gray-200 px-2 py-0.5 rounded font-bold uppercase tracking-wide">{complaint.govTicket.portalName || 'CPGRAMS'}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-mono text-sm font-bold text-gray-800">{complaint.govTicket.ticketId || complaint.govTicket}</span>
                      <button onClick={() => { navigator.clipboard.writeText(complaint.govTicket.ticketId || complaint.govTicket); toast.success('Ticket ID Copied!'); }} className="text-saffron hover:text-saffron-dark text-xs font-bold transition-colors bg-saffron-pale px-2 py-1 rounded">Copy</button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Status</div>
                    <GovStatusBadge status={complaint.govTicket.currentStatus || 'Submitted'} />
                  </div>

                  {complaint.govTicket.statusHistory && (
                    <div className="pt-2 border-t border-gray-100">
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Progression</h5>
                      <div className="space-y-2">
                        {complaint.govTicket.statusHistory?.slice(-3).map((h, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <div className="text-india-green mt-0.5">●</div>
                            <div>
                              <div className="font-bold text-gray-700">{h.status}</div>
                              <div className="text-[10px] text-gray-400">{timeAgo(h.timestamp)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 mt-2">
                    <a href={complaint.govTicket.ticketUrl || '#'} target="_blank" rel="noreferrer" className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                      Portal <FaExternalLinkAlt className="text-[10px]" />
                    </a>
                    <button onClick={async () => {
                      const tid = toast.loading('Checking status...');
                      try {
                        await govAPI.checkStatus(complaint.govTicket.ticketId || complaint.govTicket);
                        const { data } = await complaintAPI.getById(id);
                        setComplaint(data.complaint);
                        toast.success('Status updated', { id: tid });
                      } catch {
                        toast.error('Check failed', { id: tid });
                      }
                    }} className="btn-secondary text-xs py-2 flex items-center justify-center gap-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                      🔄 Check Now
                    </button>
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
    </div>
  );
}

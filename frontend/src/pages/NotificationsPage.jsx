import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notifAPI } from '../services/api';
import { timeAgo } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetch = async () => {
      try {
        const { data } = await notifAPI.getAll();
        setNotifs(data.notifications);
      } catch { } finally { setLoading(false); }
    };
    fetch();
  }, [isAuthenticated]);

  const markAllRead = async () => {
    await notifAPI.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All marked as read');
  };

  const TYPE_ICONS = { status_update: '📋', like: '❤️', comment: '💬', admin_note: '🔔', welcome: '🎉' };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-heading font-bold text-3xl"><span className="text-saffron">Notifications</span></h1>
          {notifs.some(n => !n.isRead) && (
            <button onClick={markAllRead} className="text-sm text-saffron-dark font-bold hover:underline">Mark all read</button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-7 h-7 border-4 border-saffron border-t-transparent rounded-full" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3 opacity-30">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n._id} className={`bg-white border rounded-xl p-4 flex gap-3 items-start transition-colors ${!n.isRead ? 'border-saffron/30 bg-saffron-pale/20' : 'border-gray-200'}`}>
                <span className="text-xl flex-shrink-0">{n.type === 'system' ? '🤖' : (TYPE_ICONS[n.type] || '🔔')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {n.type === 'system' && <span className="bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Auto</span>}
                    <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{n.message}</p>
                  </div>
                  {n.complaint && (
                    <Link to={`/complaint/${n.complaint._id || n.complaint}`} className="text-xs text-saffron-dark font-bold hover:underline mt-1 block">
                      View Complaint →
                    </Link>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-saffron flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

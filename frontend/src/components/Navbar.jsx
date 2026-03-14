import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Bell, Menu, X, Sun, Moon, User as UserIcon, LogOut, Megaphone, FileText, ShieldAlert, Bot } from 'lucide-react';
import { getInitials } from '../utils/helpers';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unread, shake, notifications, markAllRead, markAsRead } = useNotification();
  const [dropOpen, setDropOpen] = useState(false);
  const [dropNotif, setDropNotif] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="h-[60px] glass rounded-full flex items-center justify-between px-6 w-full max-w-5xl pointer-events-auto border border-border shadow-lg shadow-black/5">

        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black shadow-sm transition-transform group-hover:scale-105">
            <Megaphone size={18} strokeWidth={2} />
          </div>
          <span className="font-semibold text-lg tracking-tight text-foreground hidden sm:block">
            Janta Voice
          </span>
        </Link>

        {/* Center: Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">Home</Link>
          <Link to="/feed" className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">Feed</Link>
          <Link to="/aqi-monitor" className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">AQI Monitor</Link>
          {isAuthenticated && (
            <>
              <Link to="/gov-tracking" className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">Gov Tracker</Link>
              <Link to="/my-complaints" className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">My Complaints</Link>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-full transition-colors focus:outline-none" title="Toggle Dark Mode">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {isAuthenticated ? (
            <>
              <div className="relative">
                <button
                  onClick={() => { setDropNotif(!dropNotif); setDropOpen(false); }}
                  className="relative w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-full transition-colors focus:outline-none"
                >
                  <Bell size={20} className={`transition-transform ${shake ? 'animate-bounce text-primary' : ''}`} />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-background">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {dropNotif && (
                  <div className="absolute right-0 top-12 bg-background border border-border rounded-2xl shadow-xl shadow-black/5 w-80 overflow-hidden z-50 flex flex-col max-h-[400px]">
                    <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-secondary/30">
                      <h3 className="font-bold text-foreground text-sm tracking-wide">Notifications</h3>
                      <div className="flex gap-4 items-center">
                        {unread > 0 && <button onClick={() => { markAllRead(); setDropNotif(false); }} className="text-xs text-primary font-bold hover:underline transition-all">Mark all read</button>}
                        <Link to="/notifications" onClick={() => setDropNotif(false)} className="text-xs text-muted-foreground font-semibold hover:text-foreground transition-all">View All</Link>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-muted-foreground text-sm font-medium">No new notifications</p>
                      ) : (
                        notifications.slice(0, 5).map(n => (
                          <div key={n._id} onClick={() => { if (!n.isRead) markAsRead(n._id); navigate(n.complaint ? `/complaint/${n.complaint}` : '/notifications'); setDropNotif(false); }} className={`p-4 rounded-xl cursor-pointer transition-colors ${n.isRead ? 'hover:bg-secondary opacity-70' : 'bg-primary/5 hover:bg-primary/10 border border-primary/10'}`}>
                            <p className="text-sm text-foreground font-medium mb-1.5 line-clamp-2 leading-snug">{n.message}</p>
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{n.type === 'automation_rule' ? 'Automation' : n.type === 'gov_update' ? 'Gov Update' : 'System'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/report" className="hidden sm:flex btn btn-primary py-2 px-4 shadow-sm text-sm">
                Report Issue
              </Link>

              <div className="relative">
                <button onClick={() => { setDropOpen(!dropOpen); setDropNotif(false); }} className="w-10 h-10 bg-secondary text-foreground hover:bg-secondary/80 rounded-full flex items-center justify-center font-bold text-sm transition-transform border border-border">
                  {getInitials(user.name)}
                </button>
                {dropOpen && (
                  <div className="absolute right-0 top-14 bg-background border border-border rounded-2xl shadow-xl shadow-black/5 w-56 overflow-hidden z-50">
                    <div className="px-5 py-4 border-b border-border bg-secondary/30">
                      <p className="font-bold text-sm text-foreground truncate tracking-wide">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">{user.email}</p>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      <Link to="/profile" onClick={() => setDropOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary rounded-xl transition-colors">
                        <UserIcon size={18} className="text-muted-foreground" /> Profile
                      </Link>
                      <Link to="/letters" onClick={() => setDropOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary rounded-xl transition-colors">
                        <FileText size={18} className="text-muted-foreground" /> Generated Letters
                      </Link>

                      {user?.role === 'admin' && (
                        <>
                          <div className="h-px bg-border my-1 mx-2" />
                          <Link to="/admin" onClick={() => setDropOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary rounded-xl transition-colors">
                            <ShieldAlert size={18} className="text-primary" /> Admin Panel
                          </Link>
                          <Link to="/automation-admin" onClick={() => setDropOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary rounded-xl transition-colors">
                            <Bot size={18} className="text-success" /> AI Automation
                          </Link>
                        </>
                      )}

                      <div className="h-px bg-border my-1 mx-2" />
                      <button onClick={() => { logout(); setDropOpen(false); navigate('/'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors">
                        <LogOut size={18} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-full md:hidden ml-1 transition-colors"
                onClick={() => setDropOpen(!dropOpen)}
              >
                {dropOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary py-2 px-6 shadow-sm font-bold text-sm hidden sm:flex">
              Login
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}

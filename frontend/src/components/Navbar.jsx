import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaBell, FaBars, FaTimes } from 'react-icons/fa';
import { getInitials } from '../utils/helpers';

export default function Navbar({ unread = 0 }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const navigate = useNavigate();

  const navLink = 'text-gray-600 hover:text-saffron font-semibold text-sm px-3 py-2 rounded-lg hover:bg-saffron-pale transition-all';
  const navLinkActive = 'text-saffron bg-saffron-pale font-semibold text-sm px-3 py-2 rounded-lg';

  return (
    <>
      <div className="tricolor-stripe fixed top-0 left-0 right-0 z-50" />
      <nav className="fixed top-1 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.jpeg" alt="Janta Voice Logo" className="h-12 w-auto object-contain drop-shadow-sm mix-blend-multiply" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/feed" className={({ isActive }) => isActive ? navLinkActive : navLink}>Feed</NavLink>
            {isAuthenticated && <NavLink to="/my-complaints" className={({ isActive }) => isActive ? navLinkActive : navLink}>My Complaints</NavLink>}
            {isAuthenticated && <NavLink to="/gov-tracking" className={({ isActive }) => isActive ? navLinkActive : navLink}>🏛️ Gov Track</NavLink>}
            {isAuthenticated && <NavLink to="/report?tab=voice" className={({ isActive }) => isActive ? navLinkActive : navLink}>🎤 Voice Report</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" className={({ isActive }) => isActive ? navLinkActive : navLink}>Admin Panel</NavLink>}
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/notifications" className="relative w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-saffron-pale rounded-xl transition-colors">
                  <FaBell className="text-gray-500 text-sm" />
                  {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{unread > 9 ? '9+' : unread}</span>}
                </Link>
                <div className="relative">
                  <button onClick={() => setDropOpen(!dropOpen)} className="w-9 h-9 bg-gradient-to-br from-saffron to-saffron-dark rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {getInitials(user.name)}
                  </button>
                  {dropOpen && (
                    <div className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-xl w-44 overflow-hidden z-50">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="font-bold text-sm text-gray-800 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link to="/profile" onClick={() => setDropOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">👤 Profile</Link>
                      <button onClick={() => { logout(); setDropOpen(false); navigate('/'); }} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">🚪 Logout</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-saffron px-3 py-2 rounded-lg transition-colors border border-gray-200 hover:border-saffron">Login</Link>
            )}
            <Link to="/report" className="bg-saffron hover:bg-saffron-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 hidden sm:flex items-center gap-1.5">
              <span>+</span> Report
            </Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
              {mobileOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
            <NavLink to="/feed" onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-gray-700 py-2">Feed</NavLink>
            {isAuthenticated && <NavLink to="/my-complaints" onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-gray-700 py-2">My Complaints</NavLink>}
            {isAuthenticated && <NavLink to="/gov-tracking" onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-gray-700 py-2">🏛️ Gov Track</NavLink>}
            {isAuthenticated && <NavLink to="/report?tab=voice" onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-gray-700 py-2">🎤 Voice Report</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-gray-700 py-2">Admin Panel</NavLink>}
            <Link to="/report" onClick={() => setMobileOpen(false)} className="btn-primary text-center mt-1">+ Report Issue</Link>
          </div>
        )}
      </nav>
    </>
  );
}

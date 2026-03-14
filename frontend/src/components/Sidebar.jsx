import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Home, List, Clock, PlusCircle,
    Building, Bot, FileText, ShieldAlert, User
} from 'lucide-react';

export default function Sidebar() {
    const { user, isAuthenticated } = useAuth();

    const navItemClass = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
        }`;

    return (
        <aside className="fixed left-0 top-[60px] w-60 h-[calc(100vh-60px)] bg-transparent border-r border-border overflow-y-auto flex flex-col hide-scrollbar">
            <div className="p-4 flex-1 flex flex-col gap-6">

                {/* Main Section */}
                <div>
                    <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-2 px-3 uppercase">Main</h3>
                    <div className="flex flex-col gap-0.5">
                        <NavLink to="/feed" className={navItemClass}>
                            <Home size={18} />
                            <span>Dashboard</span>
                        </NavLink>
                        <NavLink to="/feed?tab=all" className={navItemClass}>
                            <List size={18} />
                            <span>All Complaints</span>
                        </NavLink>
                        {isAuthenticated && (
                            <NavLink to="/my-complaints" className={navItemClass}>
                                <Clock size={18} />
                                <span>My Complaints</span>
                            </NavLink>
                        )}
                    </div>
                </div>

                {/* Features Section */}
                <div>
                    <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-2 px-3 uppercase">Features</h3>
                    <div className="flex flex-col gap-0.5">
                        <NavLink to="/report" className={navItemClass}>
                            <PlusCircle size={18} />
                            <span>File Complaint</span>
                        </NavLink>
                        {isAuthenticated && (
                            <NavLink to="/gov-tracking" className={navItemClass}>
                                <Building size={18} />
                                <span>Gov Portals</span>
                            </NavLink>
                        )}
                        {user?.role === 'admin' && (
                            <NavLink to="/automation-admin" className={navItemClass}>
                                <Bot size={18} />
                                <span>Automation</span>
                            </NavLink>
                        )}
                        {isAuthenticated && (
                            <NavLink to="/letters" className={navItemClass}>
                                <FileText size={18} />
                                <span>Letters</span>
                            </NavLink>
                        )}
                    </div>
                </div>

                {/* Account Section */}
                <div>
                    <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-2 px-3 uppercase">Account</h3>
                    <div className="flex flex-col gap-0.5">
                        {user?.role === 'admin' && (
                            <NavLink to="/admin" className={navItemClass}>
                                <ShieldAlert size={18} />
                                <span>Admin Panel</span>
                            </NavLink>
                        )}
                        {isAuthenticated && (
                            <NavLink to="/profile" className={navItemClass}>
                                <User size={18} />
                                <span>Profile</span>
                            </NavLink>
                        )}
                    </div>
                </div>

            </div>

            {/* Stats Card at Bottom */}
            {isAuthenticated && (
                <div className="p-4 border-t border-border bg-background">
                    <div className="bg-secondary/50 border border-border rounded-2xl p-4 shadow-sm text-center">
                        <p className="text-xs font-medium text-foreground mb-2">My Impact Phase</p>
                        <div className="w-full bg-secondary rounded-full h-1.5 mb-2 overflow-hidden shadow-inner">
                            <div className="bg-primary h-full w-1/3 rounded-full"></div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Civic Contributor</p>
                    </div>
                </div>
            )}
        </aside>
    );
}

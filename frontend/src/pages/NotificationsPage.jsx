import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Bot, Building2, CircleAlert, Loader } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../utils/helpers';

export default function NotificationsPage() {
  const { notifications, markAllRead, markAsRead } = useNotification();
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  const filtered = notifications.filter(n => {
    if (filter === 'Unread') return !n.isRead;
    if (filter === 'Automation') return n.type === 'automation_rule';
    if (filter === 'Gov Updates') return n.type === 'gov_update';
    return true;
  });

  const getIcon = (type) => {
    if (type === 'automation_rule') return <Bot className="text-blue-500" size={20} />;
    if (type === 'gov_update') return <Building2 className="text-purple-500" size={20} />;
    return <CircleAlert className="text-muted-foreground" size={20} />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-24 px-4 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight">
            <Bell className="text-primary w-8 h-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground font-medium mt-2">Stay updated on your complaint statuses and government portal actions.</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button onClick={markAllRead} className="btn btn-secondary whitespace-nowrap flex items-center gap-2">
            <CheckCheck size={18} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['All', 'Unread', 'Automation', 'Gov Updates'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all whitespace-nowrap ${filter === f ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent'} border`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass-card rounded-3xl overflow-hidden min-h-[400px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
            <div className="text-6xl opacity-40">📭</div>
            <p className="font-bold text-lg">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(n => (
              <div
                key={n._id}
                onClick={() => {
                  if (!n.isRead) markAsRead(n._id);
                  if (n.complaint) navigate(`/complaint/${n.complaint}`);
                }}
                className={`p-6 hover:bg-secondary/50 transition-colors cursor-pointer flex gap-4 ${!n.isRead ? 'bg-primary/5' : ''}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${!n.isRead ? 'glass-card border border-border shadow-sm' : 'bg-secondary'}`}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-base ${!n.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>{n.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-muted-foreground">
                    <span>{timeAgo(n.createdAt)}</span>
                    {!n.isRead && <span className="text-primary">• New</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

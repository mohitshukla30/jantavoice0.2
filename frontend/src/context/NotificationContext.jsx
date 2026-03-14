import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

const NotificationContext = createContext();
export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [shake, setShake] = useState(false);
    const prevUnreadRef = useRef(0);

    const fetchNotifications = async () => {
        if (!isAuthenticated) return;
        try {
            const { data } = await notificationAPI.getAll();
            setNotifications(data.notifications || []);

            const unreadList = data.notifications?.filter(n => !n.isRead) || [];
            const currentUnread = unreadList.length;
            setUnread(currentUnread);

            if (currentUnread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
                // New notification arrived in background
                const newCount = currentUnread - prevUnreadRef.current;
                const latest = unreadList[0];
                toast(latest?.message || `You have ${newCount} new notification${newCount > 1 ? 's' : ''}!`);
                setShake(true);
                setTimeout(() => setShake(false), 3000);
            }
            prevUnreadRef.current = currentUnread;
        } catch (e) { console.error('notif poll failed'); }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
            setUnread(0);
            prevUnreadRef.current = 0;
        }
    }, [isAuthenticated]);

    const markAllRead = async () => {
        try {
            await notificationAPI.markAllRead();
            fetchNotifications();
        } catch { }
    };

    const markAsRead = async (id) => {
        try {
            await notificationAPI.markRead(id);
            fetchNotifications();
        } catch { }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unread, shake, markAllRead, markAsRead, refresh: fetchNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

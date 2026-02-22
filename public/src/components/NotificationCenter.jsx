import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { initializeSocket, joinBusiness, joinUser, onNotification, offNotification } from '../utils/socket';
import './NotificationCenter.css';

export default function NotificationCenter({ user }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Initialize socket connection
        initializeSocket();

        // Join rooms
        if (user?.businessId) {
            joinBusiness(user.businessId);
        }
        if (user?.uid) {
            joinUser(user.uid);
        }

        // Listen for notifications
        const handleNotification = (notification) => {
            console.log('[Notification]', notification);

            setNotifications(prev => [{
                ...notification,
                id: Date.now(),
                read: false
            }, ...prev].slice(0, 50)); // Keep last 50

            setUnreadCount(prev => prev + 1);

            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/logo.png'
                });
            }
        };

        onNotification(handleNotification);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            offNotification(handleNotification);
        };
    }, [user]);

    const markAsRead = (id) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="notification-icon success" />;
            case 'error':
                return <AlertCircle className="notification-icon error" />;
            case 'warning':
                return <AlertTriangle className="notification-icon warning" />;
            default:
                return <Info className="notification-icon info" />;
        }
    };

    return (
        <div className="notification-center">
            <button
                className="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="notification-actions">
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="mark-read-btn">
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={clearAll} className="clear-btn">
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="no-notifications">
                                <Bell size={48} />
                                <p>No notifications</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    {getIcon(notification.type)}
                                    <div className="notification-content">
                                        <h4>{notification.title}</h4>
                                        <p>{notification.message}</p>
                                        <span className="notification-time">
                                            {new Date(notification.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {!notification.read && <div className="unread-dot"></div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

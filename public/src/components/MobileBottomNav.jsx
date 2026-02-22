import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Calendar, Settings } from 'lucide-react';
import '../styles/MobileBottomNav.css';

/**
 * Mobile Bottom Navigation Bar
 * iOS/Android-style bottom navigation for mobile devices
 */

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ClipboardList, label: 'Work Orders', path: '/work-orders' },
    { icon: Calendar, label: 'Schedule', path: '/scheduling' },
    { icon: Users, label: 'Clients', path: '/clients' },
    { icon: Settings, label: 'More', path: '/account-settings' },
];

export default function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <nav className="mobile-bottom-nav" aria-label="Main navigation">
            {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                    <button
                        key={index}
                        onClick={() => navigate(item.path)}
                        className={`mobile-nav-item ${active ? 'active' : ''}`}
                        aria-label={item.label}
                        aria-current={active ? 'page' : undefined}
                    >
                        <Icon size={22} className="mobile-nav-icon" />
                        <span className="mobile-nav-label">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}


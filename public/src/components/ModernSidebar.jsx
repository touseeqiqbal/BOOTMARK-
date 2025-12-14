import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    Wrench,
    Package,
    FileText,
    CreditCard,
    Calendar,
    UserCircle,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    Home,
    MapPin,
    Briefcase,
    TrendingUp,
    LogOut,
    Menu,
    X,
    CheckCircle,
    Shield
} from 'lucide-react'
import { useAuth } from '../utils/AuthContext'
import { hasPermission } from '../utils/permissionUtils'
import logo from '../assets/logo.svg'
import '../styles/ModernSidebar.css'

export default function ModernSidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const { user, logout } = useAuth()

    const canManageForms = hasPermission(user, 'forms')
    const canManageCustomers = hasPermission(user, 'customers')
    const canManageInvoices = hasPermission(user, 'invoices')
    const canManageSettings = hasPermission(user, 'business.settings') || hasPermission(user, 'settings')
    const canManageUsers = hasPermission(user, 'users.manage') || hasPermission(user, 'settings')

    const menuItems = [
        {
            section: 'Main',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', permission: true },
                { icon: FileText, label: 'Forms', path: '/forms', permission: canManageForms },
                { icon: Users, label: 'Clients', path: '/clients', permission: canManageCustomers },
                { icon: MapPin, label: 'Properties', path: '/properties', permission: canManageCustomers },
            ]
        },
        {
            section: 'Operations',
            items: [
                { icon: ClipboardList, label: 'Work Orders', path: '/work-orders', permission: true },
                { icon: Calendar, label: 'Scheduling', path: '/scheduling', permission: true },
                { icon: Briefcase, label: 'Contracts', path: '/contracts', permission: true },
            ]
        },
        {
            section: 'Catalog',
            items: [
                { icon: Wrench, label: 'Services', path: '/services', permission: true },
                { icon: Package, label: 'Products', path: '/products', permission: true },
                { icon: Package, label: 'Materials', path: '/materials', permission: true },
            ]
        },
        {
            section: 'Finance',
            items: [
                { icon: FileText, label: 'Estimates', path: '/estimates', permission: true },
                { icon: CreditCard, label: 'Invoices', path: '/invoices', permission: canManageInvoices },
            ]
        },
        {
            section: 'Team',
            items: [
                { icon: UserCircle, label: 'Employees', path: '/employees', permission: true },
                { icon: Home, label: 'Crew Mobile', path: '/crew-mobile', permission: true },
            ]
        },
        {
            section: 'Analytics',
            items: [
                { icon: BarChart3, label: 'Business Reports', path: '/business-reports', permission: true },
                { icon: TrendingUp, label: 'Analytics', path: '/analytics', permission: true },
            ]
        },
        {
            section: 'Admin',
            items: [
                { icon: CheckCircle, label: 'Business Approvals', path: '/admin/approvals', permission: user?.isSuperAdmin },
                { icon: Shield, label: 'Manage Permissions', path: '/admin/business-permissions', permission: user?.isSuperAdmin },
            ]
        },
        {
            section: 'Settings',
            items: [
                { icon: Settings, label: 'Settings', path: '/account-settings', permission: true },
                { icon: Settings, label: 'Customize App', path: '/app-customization', permission: canManageSettings },
                { icon: Wrench, label: 'QuickBooks', path: '/quickbooks', permission: canManageSettings },
            ]
        }
    ]

    const isActive = (path) => {
        return location.pathname === path
    }

    const handleNavigation = (path) => {
        navigate(path)
        setMobileOpen(false)
    }

    const handleLogout = () => {
        logout()
        setMobileOpen(false)
    }

    const SidebarContent = () => (
        <>
            {/* Logo Section */}
            <div className={`sidebar-logo ${collapsed ? 'collapsed' : ''}`}>
                <img src={logo} alt="BOOTMARK" className="logo-image" />
                {!collapsed && (
                    <div className="logo-text">
                        <h1 className="logo-title gradient-text">BOOTMARK</h1>
                    </div>
                )}
            </div>

            {/* User Profile */}
            <div className={`sidebar-profile ${collapsed ? 'collapsed' : ''}`}>
                <div className="profile-avatar">
                    <UserCircle size={collapsed ? 32 : 40} />
                </div>
                {!collapsed && (
                    <div className="profile-info">
                        <p className="profile-name">{user?.name || user?.email}</p>
                        <p className="profile-role">{user?.businessRole || 'Admin'}</p>
                    </div>
                )}
            </div>

            {/* Navigation Menu */}
            <nav className="sidebar-nav">
                {menuItems.map((section, idx) => {
                    const visibleItems = section.items.filter(item => item.permission)
                    if (visibleItems.length === 0) return null

                    return (
                        <div key={idx} className="nav-section">
                            {!collapsed && <div className="nav-section-title">{section.section}</div>}
                            {visibleItems.map((item, itemIdx) => {
                                const Icon = item.icon
                                const active = isActive(item.path)

                                return (
                                    <button
                                        key={itemIdx}
                                        onClick={() => handleNavigation(item.path)}
                                        className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                                        title={collapsed ? item.label : ''}
                                    >
                                        <Icon size={20} className="nav-icon" />
                                        {!collapsed && <span className="nav-label">{item.label}</span>}
                                        {active && <div className="nav-indicator" />}
                                    </button>
                                )
                            })}
                        </div>
                    )
                })}
            </nav>

            {/* Logout Button */}
            <div className="sidebar-footer">
                <button
                    onClick={handleLogout}
                    className={`nav-item logout-btn ${collapsed ? 'collapsed' : ''}`}
                    title={collapsed ? 'Logout' : ''}
                >
                    <LogOut size={20} className="nav-icon" />
                    {!collapsed && <span className="nav-label">Logout</span>}
                </button>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="sidebar-toggle"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
        </>
    )

    return (
        <div className="modern-layout">
            {/* Mobile Menu Button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop Sidebar */}
            <aside className={`modern-sidebar ${collapsed ? 'collapsed' : ''}`}>
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            {mobileOpen && (
                <>
                    <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
                    <aside className="modern-sidebar mobile">
                        <SidebarContent />
                    </aside>
                </>
            )}

            {/* Main Content */}
            <main className={`modern-content ${collapsed ? 'expanded' : ''}`}>
                <Outlet />
            </main>
        </div>
    )
}

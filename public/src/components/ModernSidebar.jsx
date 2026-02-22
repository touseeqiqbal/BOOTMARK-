import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
    Shield,
    Search,
    Star,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import { useAuth } from '../utils/AuthContext'
import { hasPermission } from '../utils/permissionUtils'
import LanguageSwitcher from './LanguageSwitcher'
import MobileBottomNav from './MobileBottomNav'
import logo from '../assets/logo.jpeg'
import '../styles/ModernSidebar.css'


export default function ModernSidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedSections, setExpandedSections] = useState(() => {
        // Default: expand first 2 sections, collapse others
        const saved = localStorage.getItem('sidebarExpandedSections')
        return saved ? JSON.parse(saved) : { 0: true, 1: true }
    })
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('sidebarFavorites')
        return saved ? JSON.parse(saved) : []
    })
    const [recentItems, setRecentItems] = useState(() => {
        const saved = localStorage.getItem('sidebarRecentItems')
        return saved ? JSON.parse(saved) : []
    })
    const navigate = useNavigate()
    const location = useLocation()
    const { user, logout } = useAuth()
    const { t } = useTranslation()

    const canManageForms = hasPermission(user, 'forms')
    const canManageCustomers = hasPermission(user, 'customers')
    const canManageProperties = hasPermission(user, 'properties')
    const canManageWorkOrders = hasPermission(user, 'workOrders')
    const canManageInvoices = hasPermission(user, 'invoices')
    const canManageScheduling = hasPermission(user, 'scheduling')
    const canManageContracts = hasPermission(user, 'contracts')
    const canManageServices = hasPermission(user, 'services')
    const canManageProducts = hasPermission(user, 'products')
    const canManageTeam = hasPermission(user, 'team')
    const canManageReports = hasPermission(user, 'reports')
    const canManageSettings = hasPermission(user, 'business.settings') || hasPermission(user, 'settings')
    const canManageUsers = hasPermission(user, 'users.manage') || hasPermission(user, 'settings')

    const menuItems = [
        {
            section: t('sidebar.main'),
            items: [
                { icon: LayoutDashboard, label: t('sidebar.dashboard'), path: '/dashboard', permission: true },
                { icon: FileText, label: t('sidebar.forms'), path: '/forms', permission: canManageForms },
                { icon: Users, label: t('sidebar.clients'), path: '/clients', permission: canManageCustomers },
                { icon: MapPin, label: t('sidebar.properties'), path: '/properties', permission: canManageProperties || canManageCustomers },
            ]
        },
        {
            section: t('sidebar.operations'),
            items: [
                { icon: ClipboardList, label: t('sidebar.workOrders'), path: '/work-orders', permission: canManageWorkOrders },
                { icon: Settings, label: 'Workflows', path: '/job-workflows', permission: canManageWorkOrders },
                { icon: Calendar, label: t('sidebar.scheduling'), path: '/scheduling', permission: canManageScheduling },
                { icon: Briefcase, label: t('sidebar.contracts'), path: '/contracts', permission: canManageContracts },
            ]
        },
        {
            section: t('sidebar.catalog'),
            items: [
                { icon: Wrench, label: t('sidebar.services'), path: '/services', permission: canManageServices },
                { icon: Package, label: t('sidebar.products'), path: '/products', permission: canManageProducts },
                { icon: Package, label: t('sidebar.materials'), path: '/materials', permission: canManageProducts },
            ]
        },
        {
            section: t('sidebar.finance'),
            items: [
                { icon: FileText, label: t('sidebar.estimates'), path: '/estimates', permission: canManageInvoices },
                { icon: CreditCard, label: t('sidebar.invoices'), path: '/invoices', permission: canManageInvoices },
            ]
        },
        {
            section: t('sidebar.team'),
            items: [
                { icon: UserCircle, label: t('sidebar.employees'), path: '/employees', permission: canManageTeam },
                { icon: Home, label: t('sidebar.crewMobile'), path: '/crew-mobile', permission: canManageTeam },
            ]
        },
        {
            section: t('sidebar.analytics'),
            items: [
                { icon: BarChart3, label: t('sidebar.businessReports'), path: '/business-reports', permission: canManageReports },
                { icon: TrendingUp, label: 'Analytics', path: '/analytics', permission: canManageReports },
            ]
        },
        {
            section: t('sidebar.admin'),
            items: [
                { icon: CheckCircle, label: t('sidebar.businessApprovals'), path: '/admin/approvals', permission: user?.isSuperAdmin },
                { icon: Shield, label: t('sidebar.managePermissions'), path: '/admin/business-permissions', permission: user?.isSuperAdmin },
            ]
        },
        {
            section: t('sidebar.settings'),
            items: [
                { icon: Settings, label: t('sidebar.settings'), path: '/account-settings', permission: true },
                { icon: Settings, label: t('sidebar.customizeApp'), path: '/app-customization', permission: canManageSettings },
                { icon: Wrench, label: t('sidebar.quickbooks'), path: '/quickbooks', permission: canManageSettings },
            ]
        }
    ]

    const isActive = (path) => {
        return location.pathname === path
    }

    const handleNavigation = (path, label) => {
        navigate(path)
        setMobileOpen(false)

        // Track recent items (max 5)
        setRecentItems(prev => {
            const filtered = prev.filter(item => item.path !== path)
            const updated = [{ path, label, timestamp: Date.now() }, ...filtered].slice(0, 5)
            localStorage.setItem('sidebarRecentItems', JSON.stringify(updated))
            return updated
        })
    }

    const toggleSection = (sectionIndex) => {
        setExpandedSections(prev => {
            const updated = { ...prev, [sectionIndex]: !prev[sectionIndex] }
            localStorage.setItem('sidebarExpandedSections', JSON.stringify(updated))
            return updated
        })
    }

    const toggleFavorite = (path, label, e) => {
        e.stopPropagation()
        setFavorites(prev => {
            const isFavorite = prev.some(fav => fav.path === path)
            const updated = isFavorite
                ? prev.filter(fav => fav.path !== path)
                : [...prev, { path, label, timestamp: Date.now() }]
            localStorage.setItem('sidebarFavorites', JSON.stringify(updated))
            return updated
        })
    }

    const isFavorite = (path) => {
        return favorites.some(fav => fav.path === path)
    }

    // Filter menu items based on search
    const filteredMenuItems = menuItems.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!item.permission) return false
            if (!searchTerm) return true
            const searchLower = searchTerm.toLowerCase()
            return item.label.toLowerCase().includes(searchLower) ||
                section.section.toLowerCase().includes(searchLower)
        })
    })).filter(section => section.items.length > 0)

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

            {/* Search Bar */}
            {!collapsed && (
                <div className="sidebar-search" style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.7)' }} />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="sidebar-search-input"
                            style={{
                                width: '100%',
                                padding: 'var(--space-2) var(--space-2) var(--space-2) 36px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 'var(--radius-lg)',
                                color: 'white',
                                fontSize: 'var(--text-sm)',
                                outline: 'none'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Favorites Section */}
            {!collapsed && favorites.length > 0 && !searchTerm && (
                <div className="nav-section" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="nav-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Star size={14} fill="currentColor" />
                        Favorites
                    </div>
                    {favorites.map((fav, idx) => {
                        const menuItem = menuItems
                            .flatMap(s => s.items)
                            .find(item => item.path === fav.path && item.permission)
                        if (!menuItem) return null
                        const Icon = menuItem.icon
                        const active = isActive(fav.path)
                        return (
                            <button
                                key={idx}
                                onClick={() => handleNavigation(fav.path, fav.label)}
                                className={`nav-item ${active ? 'active' : ''}`}
                            >
                                <Icon size={20} className="nav-icon" />
                                <span className="nav-label">{fav.label}</span>
                                {active && <div className="nav-indicator" />}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Navigation Menu */}
            <nav className="sidebar-nav">
                {filteredMenuItems.map((section, idx) => {
                    if (section.items.length === 0) return null
                    const isExpanded = expandedSections[idx] !== false
                    const hasMultipleItems = section.items.length > 1

                    return (
                        <div key={idx} className="nav-section">
                            {!collapsed && (
                                <button
                                    className="nav-section-title"
                                    onClick={() => hasMultipleItems && toggleSection(idx)}
                                    style={{
                                        cursor: hasMultipleItems ? 'pointer' : 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        background: 'none',
                                        border: 'none',
                                        color: 'inherit',
                                        padding: 'var(--space-2) var(--space-3)',
                                        borderRadius: 'var(--radius-md)',
                                        transition: 'background var(--transition-base)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (hasMultipleItems) e.target.style.background = 'rgba(255,255,255,0.1)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'none'
                                    }}
                                >
                                    <span>{section.section}</span>
                                    {hasMultipleItems && (
                                        isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </button>
                            )}
                            {(!collapsed && isExpanded || collapsed) && section.items.map((item, itemIdx) => {
                                const Icon = item.icon
                                const active = isActive(item.path)
                                const favorite = isFavorite(item.path)

                                return (
                                    <div
                                        key={itemIdx}
                                        onClick={() => handleNavigation(item.path, item.label)}
                                        className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                                        title={collapsed ? item.label : ''}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                handleNavigation(item.path, item.label)
                                            }
                                        }}
                                    >
                                        <Icon size={20} className="nav-icon" />
                                        {!collapsed && (
                                            <>
                                                <span className="nav-label">{item.label}</span>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleFavorite(item.path, item.label, e)
                                                    }}
                                                    className="nav-favorite-btn"
                                                    title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.stopPropagation()
                                                            toggleFavorite(item.path, item.label, e)
                                                        }
                                                    }}
                                                    style={{
                                                        marginLeft: 'auto',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: favorite ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
                                                </div>
                                            </>
                                        )}
                                        {active && <div className="nav-indicator" />}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </nav>

            {/* Logout Button */}
            <div className="sidebar-footer">
                <div style={{ marginBottom: '10px', padding: collapsed ? '0' : '0 12px' }}>
                    <LanguageSwitcher compact={collapsed} />
                </div>
                <button
                    onClick={handleLogout}
                    className={`nav-item logout-btn ${collapsed ? 'collapsed' : ''}`}
                    title={collapsed ? t('sidebar.logout') : ''}
                >
                    <LogOut size={20} className="nav-icon" />
                    {!collapsed && <span className="nav-label">{t('sidebar.logout')}</span>}
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
            <main id="main-content" className={`modern-content ${collapsed ? 'expanded' : ''}`} tabIndex={-1}>
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    )
}

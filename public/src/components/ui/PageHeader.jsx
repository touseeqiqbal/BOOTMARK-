import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../../styles/PageHeader.css';

const PageHeader = ({
    title,
    subtitle,
    icon,
    showBack = false,
    backPath = -1,
    actions,
    children
}) => {
    const navigate = useNavigate();

    return (
        <div className="page-header animate-fadeIn">
            <div className="page-header-top">
                <div className="page-header-title-section">
                    {showBack && (
                        <button
                            className="btn-modern btn-modern-secondary btn-sm"
                            onClick={() => navigate(backPath)}
                            style={{ padding: 'var(--space-2)' }}
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    {icon && (
                        <div className="page-header-icon">
                            {React.isValidElement(icon) ? icon : React.createElement(icon, { size: 22 })}
                        </div>
                    )}
                    <div className="page-header-text">
                        <h1 className="page-header-title">{title}</h1>
                        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
                    </div>
                </div>
                {actions && (
                    <div className="page-header-actions">
                        <div className="page-header-actions-primary">
                            {actions}
                        </div>
                    </div>
                )}
            </div>
            {children}
        </div>
    );
};

export default PageHeader;

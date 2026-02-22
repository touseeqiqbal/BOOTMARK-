import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * FilterTabs Component
 * 
 * A reusable component for displaying filter tabs with counts
 * 
 * @param {Array} filters - Array of filter objects with { id, label, count, filterFn }
 * @param {String} activeFilter - Currently active filter ID
 * @param {Function} onFilterChange - Callback when filter changes
 * @param {String} className - Additional CSS classes
 */
export default function FilterTabs({ filters = [], activeFilter = 'all', onFilterChange, className = '' }) {
    const handleFilterClick = (filterId) => {
        if (onFilterChange) {
            onFilterChange(filterId);
        }
    };

    return (
        <div className={`filter-tabs ${className}`} style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: 'var(--space-4)',
            padding: '4px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch'
        }}>
            {filters.map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                    <button
                        key={filter.id}
                        onClick={() => handleFilterClick(filter.id)}
                        className={`filter-tab ${isActive ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            background: isActive ? 'var(--primary-600)' : 'transparent',
                            color: isActive ? 'white' : 'var(--text-secondary)',
                            fontSize: '14px',
                            fontWeight: isActive ? '700' : '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                            outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.background = 'var(--bg-primary)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }
                        }}
                    >
                        <span>{filter.label}</span>
                        {typeof filter.count !== 'undefined' && (
                            <span
                                className="filter-count"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '20px',
                                    height: '20px',
                                    padding: '0 6px',
                                    borderRadius: 'var(--radius-full)',
                                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-tertiary)',
                                    color: isActive ? 'white' : 'var(--text-tertiary)',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    lineHeight: '1'
                                }}
                            >
                                {filter.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

FilterTabs.propTypes = {
    filters: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            count: PropTypes.number,
            filterFn: PropTypes.func
        })
    ).isRequired,
    activeFilter: PropTypes.string,
    onFilterChange: PropTypes.func.isRequired,
    className: PropTypes.string
};

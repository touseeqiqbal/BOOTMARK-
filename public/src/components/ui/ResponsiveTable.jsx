import React, { useState, useEffect } from 'react';
import { ChevronRight, Eye } from 'lucide-react';
import '../../styles/ResponsiveTable.css';

/**
 * ResponsiveTable Component
 * Automatically switches between table and card layout based on screen size
 * 
 * @param {Array} columns - Column definitions with { key, label, priority, render }
 * @param {Array} data - Array of data objects
 * @param {Function} onRowClick - Optional row click handler
 * @param {string} className - Additional CSS classes
 * @param {boolean} showMobileCards - Force card layout on mobile (default: true)
 * @param {boolean} enableHorizontalScroll - Enable horizontal scroll on mobile (default: true)
 */
export default function ResponsiveTable({
    columns = [],
    data = [],
    onRowClick,
    className = '',
    showMobileCards = true,
    enableHorizontalScroll = true,
    emptyMessage = 'No data available',
    loading = false
}) {
    const [isMobile, setIsMobile] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleRow = (index) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleRowClick = (row, index) => {
        if (isMobile && showMobileCards) {
            toggleRow(index);
        }
        if (onRowClick) {
            onRowClick(row, index);
        }
    };

    // Sort columns by priority (lower number = higher priority)
    const sortedColumns = [...columns].sort((a, b) => {
        const priorityA = a.priority ?? 999;
        const priorityB = b.priority ?? 999;
        return priorityA - priorityB;
    });

    // Get primary columns (priority 1-3) for mobile card header
    const primaryColumns = sortedColumns.filter(col => (col.priority ?? 999) <= 3).slice(0, 3);
    const secondaryColumns = sortedColumns.filter(col => (col.priority ?? 999) > 3);

    if (loading) {
        return (
            <div className="responsive-table-loading">
                <div className="loading-spinner"></div>
                <p>Loading data...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="responsive-table-empty">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    // Mobile Card Layout
    if (isMobile && showMobileCards) {
        return (
            <div className={`responsive-table-mobile ${className}`}>
                {data.map((row, index) => {
                    const isExpanded = expandedRows.has(index);
                    const primaryData = primaryColumns.map(col => ({
                        ...col,
                        value: col.render ? col.render(row[col.key], row, index) : row[col.key]
                    }));
                    const secondaryData = secondaryColumns.map(col => ({
                        ...col,
                        value: col.render ? col.render(row[col.key], row, index) : row[col.key]
                    }));

                    return (
                        <div
                            key={index}
                            className={`responsive-table-card ${isExpanded ? 'expanded' : ''} ${onRowClick ? 'clickable' : ''}`}
                            onClick={() => handleRowClick(row, index)}
                        >
                            <div className="responsive-table-card-header">
                                <div className="responsive-table-card-primary">
                                    {primaryData.map((col, colIndex) => (
                                        <div key={col.key || colIndex} className="responsive-table-card-field">
                                            <span className="responsive-table-card-label">{col.label}:</span>
                                            <span className="responsive-table-card-value">{col.value ?? '—'}</span>
                                        </div>
                                    ))}
                                </div>
                                {secondaryColumns.length > 0 && (
                                    <button
                                        className="responsive-table-card-toggle"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRow(index);
                                        }}
                                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                        <ChevronRight size={20} className={isExpanded ? 'expanded' : ''} />
                                    </button>
                                )}
                            </div>
                            {isExpanded && secondaryData.length > 0 && (
                                <div className="responsive-table-card-details">
                                    {secondaryData.map((col, colIndex) => (
                                        <div key={col.key || colIndex} className="responsive-table-card-field">
                                            <span className="responsive-table-card-label">{col.label}:</span>
                                            <span className="responsive-table-card-value">{col.value ?? '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Desktop Table Layout with Horizontal Scroll
    return (
        <div className={`responsive-table-wrapper ${className} ${enableHorizontalScroll ? 'scrollable' : ''}`}>
            <div className="responsive-table-scroll-indicator left" aria-hidden="true">
                <div className="scroll-indicator-arrow">←</div>
            </div>
            <div className="responsive-table-scroll-indicator right" aria-hidden="true">
                <div className="scroll-indicator-arrow">→</div>
            </div>
            <table className="responsive-table">
                <thead>
                    <tr>
                        {sortedColumns.map((column, index) => (
                            <th
                                key={column.key || index}
                                className={`responsive-table-header ${column.className || ''}`}
                                data-priority={column.priority ?? 999}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className={onRowClick ? 'clickable' : ''}
                            onClick={() => onRowClick && onRowClick(row, rowIndex)}
                        >
                            {sortedColumns.map((column, colIndex) => (
                                <td
                                    key={column.key || colIndex}
                                    className={`responsive-table-cell ${column.className || ''}`}
                                    data-priority={column.priority ?? 999}
                                >
                                    {column.render
                                        ? column.render(row[column.key], row, rowIndex)
                                        : row[column.key] ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


import React from 'react';
import '../../styles/Skeleton.css';

/**
 * Skeleton Component for perceived performance (2026 Standards)
 * @param {string} variant - 'text', 'circular', 'rectangular', 'rounded'
 * @param {string|number} width - CSS width
 * @param {string|number} height - CSS height
 * @param {string} className - Additional classes
 */
export default function Skeleton({
    variant = 'text',
    width,
    height,
    className = '',
    style = {}
}) {
    const baseStyles = {
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'text' ? '1em' : undefined),
        ...style
    };

    return (
        <div
            className={`skeleton skeleton-${variant} ${className}`}
            style={baseStyles}
            aria-hidden="true"
        />
    );
}

export function SkeletonCircle({ size = 40, className = '' }) {
    return <Skeleton variant="circular" width={size} height={size} className={className} />;
}

export function SkeletonText({ lines = 1, className = '', lastlineWidth = '70%' }) {
    return (
        <div className={`skeleton-text-group ${className}`}>
            {[...Array(lines)].map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    width={i === lines - 1 ? lastlineWidth : '100%'}
                    style={{ marginBottom: i === lines - 1 ? 0 : '0.5em' }}
                />
            ))}
        </div>
    );
}

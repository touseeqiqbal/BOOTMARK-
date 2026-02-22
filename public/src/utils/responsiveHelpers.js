/**
 * Responsive Helper Utilities
 * Provides consistent breakpoint management and responsive utilities
 */

// React import must be at top for hooks
import React from 'react';

/**
 * Standardized breakpoints (mobile-first)
 * These match the CSS custom properties in modern-ui.css
 */
export const BREAKPOINTS = {
    xs: 320,   // Small phones (iPhone SE)
    sm: 480,   // Large phones
    md: 768,   // Tablets (iPad)
    lg: 1024,  // Laptops (iPad Pro)
    xl: 1280,  // Desktops
    '2xl': 1536, // Large desktops
    '4k': 2560   // Ultra-wide / 4K displays
};

/**
 * Check if current viewport matches a breakpoint
 * @param {string} breakpoint - Breakpoint name (xs, sm, md, lg, xl, 2xl, 4k)
 * @param {string} direction - 'min' or 'max' (default: 'min')
 * @returns {boolean}
 */
export function matchesBreakpoint(breakpoint, direction = 'min') {
    if (typeof window === 'undefined') return false;
    
    const width = BREAKPOINTS[breakpoint];
    if (!width) {
        console.warn(`Unknown breakpoint: ${breakpoint}`);
        return false;
    }

    if (direction === 'min') {
        return window.innerWidth >= width;
    } else {
        return window.innerWidth < width;
    }
}

/**
 * Get current breakpoint name
 * @returns {string} Current breakpoint name
 */
export function getCurrentBreakpoint() {
    if (typeof window === 'undefined') return 'xs';
    
    const width = window.innerWidth;
    
    if (width >= BREAKPOINTS['4k']) return '4k';
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
}

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export function isMobile() {
    return typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.md;
}

/**
 * Check if device is tablet
 * @returns {boolean}
 */
export function isTablet() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
}

/**
 * Check if device is desktop
 * @returns {boolean}
 */
export function isDesktop() {
    return typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.lg;
}

/**
 * Check if device is touch-enabled
 * @returns {boolean}
 */
export function isTouchDevice() {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Hook for responsive breakpoint tracking
 * @param {string} breakpoint - Breakpoint to track
 * @param {string} direction - 'min' or 'max'
 * @returns {boolean}
 */
export function useBreakpoint(breakpoint, direction = 'min') {
    const [matches, setMatches] = React.useState(() => 
        matchesBreakpoint(breakpoint, direction)
    );

    React.useEffect(() => {
        const handleResize = () => {
            setMatches(matchesBreakpoint(breakpoint, direction));
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Check initial state

        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint, direction]);

    return matches;
}

/**
 * Get responsive value based on breakpoint
 * @param {Object} values - Object with breakpoint keys and values
 * @param {*} defaultValue - Default value if no breakpoint matches
 * @returns {*} Value for current breakpoint
 */
export function getResponsiveValue(values, defaultValue = null) {
    const current = getCurrentBreakpoint();
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '4k'];
    const currentIndex = breakpoints.indexOf(current);

    // Find the highest breakpoint value that matches
    for (let i = currentIndex; i >= 0; i--) {
        if (values[breakpoints[i]] !== undefined) {
            return values[breakpoints[i]];
        }
    }

    return defaultValue;
}


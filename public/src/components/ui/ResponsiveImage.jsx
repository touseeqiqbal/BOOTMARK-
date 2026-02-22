import React, { useState } from 'react';
import '../../styles/ResponsiveImage.css';

/**
 * ResponsiveImage Component
 * Provides responsive image loading with srcset, sizes, and lazy loading
 * 
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text (required for accessibility)
 * @param {string|Array} srcset - Responsive image sources
 * @param {string} sizes - Sizes attribute for responsive images
 * @param {string} className - Additional CSS classes
 * @param {string} aspectRatio - Aspect ratio (e.g., '16/9', '1/1')
 * @param {boolean} lazy - Enable lazy loading (default: true)
 * @param {string} objectFit - Object fit property (contain, cover, etc.)
 */
export default function ResponsiveImage({
    src,
    alt,
    srcset,
    sizes,
    className = '',
    aspectRatio,
    lazy = true,
    objectFit = 'contain',
    ...props
}) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const handleLoad = () => {
        setLoaded(true);
    };

    const handleError = () => {
        setError(true);
    };

    // Generate srcset from array if provided
    const srcsetValue = Array.isArray(srcset)
        ? srcset.map(({ src: srcUrl, width }) => `${srcUrl} ${width}w`).join(', ')
        : srcset;

    // Default sizes if not provided
    const sizesValue = sizes || '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';

    const imageClasses = [
        'responsive-image',
        className,
        loaded ? 'loaded' : '',
        error ? 'error' : ''
    ].filter(Boolean).join(' ');

    const containerStyle = aspectRatio
        ? { aspectRatio, position: 'relative', overflow: 'hidden' }
        : {};

    const imageStyle = {
        objectFit,
        width: '100%',
        height: aspectRatio ? '100%' : 'auto'
    };

    if (error) {
        return (
            <div className="responsive-image-error" style={containerStyle}>
                <span>Image failed to load</span>
            </div>
        );
    }

    return (
        <div className="responsive-image-container" style={containerStyle}>
            {!loaded && (
                <div className="responsive-image-placeholder">
                    <div className="responsive-image-skeleton"></div>
                </div>
            )}
            <img
                src={src}
                srcSet={srcsetValue}
                sizes={sizesValue}
                alt={alt}
                className={imageClasses}
                loading={lazy ? 'lazy' : 'eager'}
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                style={imageStyle}
                {...props}
            />
        </div>
    );
}


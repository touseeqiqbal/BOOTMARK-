import React from 'react';
import { Loader2 } from 'lucide-react';
import '../../styles/Button.css';

/**
 * Unified Button Component
 * Replaces all inline button styles throughout the app
 * 
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable button
 * @param {string} type - HTML button type
 * @param {React.ReactNode} children - Button content
 * @param {string} className - Additional CSS classes
 * @param {object} ...props - Other button props
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  children,
  className = '',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  ...props
}) {
  const baseClasses = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  const widthClass = fullWidth ? 'btn-full-width' : '';
  const loadingClass = loading ? 'btn-loading' : '';
  
  const classes = [
    baseClasses,
    variantClass,
    sizeClass,
    widthClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading && (
        <Loader2 
          className="btn-spinner" 
          size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
          aria-hidden="true"
        />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon-left" aria-hidden="true">{icon}</span>
      )}
      <span className="btn-content">{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon-right" aria-hidden="true">{icon}</span>
      )}
    </button>
  );
}

// Export button variants as separate components for convenience
export function PrimaryButton(props) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props) {
  return <Button variant="secondary" {...props} />;
}

export function GhostButton(props) {
  return <Button variant="ghost" {...props} />;
}

export function DangerButton(props) {
  return <Button variant="danger" {...props} />;
}

export function OutlineButton(props) {
  return <Button variant="outline" {...props} />;
}


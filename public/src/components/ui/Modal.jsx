import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import '../../styles/Modal.css';

/**
 * Unified Modal Component
 * Base modal with consistent styling, focus trap, and ESC key handling
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {React.ReactNode} footer - Custom footer content
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} closeOnOverlayClick - Close when clicking overlay
 * @param {boolean} showCloseButton - Show X button
 * @param {string} className - Additional CSS classes
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
  ariaLabel,
  ariaLabelledBy
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Store previous active element
    previousActiveElement.current = document.activeElement;

    // Focus modal on open
    const timer = setTimeout(() => {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0];
      if (firstElement) {
        firstElement.focus();
      } else {
        modalRef.current?.focus();
      }
    }, 100);

    // ESC key handler
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      
      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Focus trap - keep focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Animation handling
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalId = title ? `modal-${title.toLowerCase().replace(/\s+/g, '-')}` : 'modal';

  return (
    <div
      className={`modal-overlay ${isAnimating ? 'modal-entering' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy || (title ? `${modalId}-title` : undefined)}
    >
      <div
        ref={modalRef}
        className={`modal-content modal-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id={`${modalId}-title`} className="modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Convenience component for confirmation modals
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  ...props
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      }
      {...props}
    >
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{message}</p>
    </Modal>
  );
}


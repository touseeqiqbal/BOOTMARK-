import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

/**
 * Confirmation Modal Component
 * Replaces window.confirm() with a modern modal dialog
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Close handler (called when cancelled)
 * @param {function} onConfirm - Confirm handler
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - Button variant for confirm button ('danger' | 'primary', default: 'danger')
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={true}
    >
      <div style={{ padding: '20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.6' }}>
            {message}
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
        <Button variant="secondary" onClick={onClose}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={handleConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}


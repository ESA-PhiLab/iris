import React, { useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'error';
}

/**
 * Reusable Confirmation Dialog Component
 * 
 * A simple modal for confirming user actions with customizable message and buttons.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  // Handle Escape key
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.code === 'Escape') {
          onClose();
          event.preventDefault();
          event.stopPropagation();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div id="dialogue" className="dialogue" style={{ display: 'block' }} data-testid="confirm-dialog">
      <div className="dialogue-content">
        {title && (
          <div className="dialogue-header">
            <span className="dialogue-close" onClick={onClose}>
              &times;
            </span>
            <h2>{title}</h2>
          </div>
        )}
        <div className="dialogue-body">
          <div className={`dialogue-${type}`}>
            <p>{message}</p>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                style={{ marginRight: '10px' }}
              >
                {confirmText}
              </button>
              <button onClick={onClose}>
                {cancelText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

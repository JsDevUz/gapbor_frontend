import React from 'react';
import { HiX } from 'react-icons/hi';
import './UniversalDialog.css';

const UniversalDialog = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = ''
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="universal-dialog-overlay" onClick={handleOverlayClick}>
      <div className={`universal-dialog universal-dialog--${size} ${className}`}>
        {showCloseButton && (
          <button className="universal-dialog__close" onClick={handleClose}>
            <HiX size={20} />
          </button>
        )}
        
        {title && (
          <div className="universal-dialog__header">
            <h2 className="universal-dialog__title">{title}</h2>
          </div>
        )}
        
        <div className="universal-dialog__content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default UniversalDialog;

import React, { useEffect } from 'react';
import { useSegmentationStore } from '../stores/segmentationStore';
import { useTheme } from '../contexts/ThemeContext';

interface ClassSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Class Selection Modal Component
 * 
 * Displays an overview of all segmentation classes with their colors,
 * descriptions, and pixel counts. Allows users to select a class for drawing.
 */
const ClassSelectionModal: React.FC<ClassSelectionModalProps> = ({ isOpen, onClose }) => {
  const { classes, userPixelCounts, currentClass, setCurrentClass } = useSegmentationStore();
  const { theme } = useTheme();

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

  const handleClassSelect = (index: number) => {
    setCurrentClass(index);
    onClose();
  };

  const rgba2css = (colour: number[]) => {
    if (!colour || colour.length < 4) return 'rgba(128, 128, 128, 1)';
    return `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${colour[3] / 255})`;
  };

  const niceNumber = (num: number): string => {
    if (!num) return '0';
    if (num < 1000) return num.toFixed(0);
    if (num < 1000000) return (num / 1000).toFixed(1) + 'k';
    return (num / 1000000).toFixed(1) + 'M';
  };

  return (
    <div
      data-testid="class-selection-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.modalOverlay,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          backgroundColor: theme.modalBg,
          border: `1px solid ${theme.modalBorder}`,
          borderRadius: '12px',
          width: '520px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.25s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: theme.modalHeaderBg,
            borderBottom: `1px solid ${theme.modalBorder}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: theme.gray900, letterSpacing: '-0.01em' }}>
              Class selection
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.gray500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.bgTertiary;
              e.currentTarget.style.color = theme.gray900;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.gray500;
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: theme.gray600 }}>
            Select a class to start drawing:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {classes.map((classItem, index) => {
              const isSelected = currentClass === index;
              const color = rgba2css(classItem.colour);
              return (
                <button
                  key={index}
                  onClick={() => handleClassSelect(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: isSelected
                      ? `2px solid ${theme.primary}`
                      : `1px solid ${theme.modalBorder}`,
                    backgroundColor: isSelected ? theme.primaryPale : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = theme.bgSecondary;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Color swatch */}
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: color,
                    border: `1px solid ${theme.modalBorder}`,
                    flexShrink: 0,
                  }} />

                  {/* Name + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: isSelected ? 600 : 500,
                      color: theme.gray900,
                    }}>
                      {classItem.name}
                    </div>
                    {classItem.description && (
                      <div style={{
                        fontSize: '12px',
                        color: theme.gray500,
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {classItem.description}
                      </div>
                    )}
                  </div>

                  {/* Pixel count */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: theme.gray500,
                    backgroundColor: theme.bgTertiary,
                    padding: '3px 8px',
                    borderRadius: '10px',
                    flexShrink: 0,
                  }}>
                    {niceNumber(userPixelCounts[index] || 0)} px
                  </div>

                  {/* Selected check */}
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ClassSelectionModal;

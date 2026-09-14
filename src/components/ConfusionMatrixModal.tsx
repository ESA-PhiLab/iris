import React, { useEffect } from 'react';
import { useSegmentationStore } from '../stores/segmentationStore';
import { useTheme } from '../contexts/ThemeContext';

interface ConfusionMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Confusion Matrix Modal Component
 * 
 * Displays the AI model's confusion matrix showing prediction accuracy
 * across different classes. Themed for Light/Dark design system.
 */
const ConfusionMatrixModal: React.FC<ConfusionMatrixModalProps> = ({ isOpen, onClose }) => {
  const confusionMatrix = useSegmentationStore(state => state.confusionMatrix);
  const { theme } = useTheme();

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

  const niceNumber = (num: number): string => {
    if (num === null || num === undefined) return '0';
    if (num < 1000) return num.toFixed(0);
    if (num < 1000000) return (num / 1000).toFixed(1) + 'k';
    return (num / 1000000).toFixed(1) + 'M';
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.modalOverlay,
    animation: 'fadeIn 0.2s ease',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.modalBg,
    border: `1px solid ${theme.modalBorder}`,
    borderRadius: '12px',
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.25s ease',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: theme.modalHeaderBg,
    borderBottom: `1px solid ${theme.modalBorder}`,
  };

  // Empty state — AI not trained yet
  if (!confusionMatrix) {
    return (
      <div
        data-testid="confusion-matrix-modal"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={overlayStyle}
      >
        <div style={cardStyle}>
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span style={{ fontSize: '15px', fontWeight: 600, color: theme.gray900, letterSpacing: '-0.01em' }}>
                Confusion Matrix
              </span>
            </div>
            <CloseButton theme={theme} onClose={onClose} />
          </div>
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.gray400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ color: theme.gray600, fontSize: '14px', margin: 0 }}>
              Train the AI first to see the confusion matrix
            </p>
          </div>
        </div>
        <ModalAnimations />
      </div>
    );
  }

  const { classes, matrix, accuracyStats, totalSamples, timestamp } = confusionMatrix;

  return (
    <div
      data-testid="confusion-matrix-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={overlayStyle}
    >
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: theme.gray900, letterSpacing: '-0.01em' }}>
              Confusion Matrix
            </span>
          </div>
          <CloseButton theme={theme} onClose={onClose} />
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <StatCard label="AI Score" value={`${(accuracyStats.overall * 100).toFixed(1)}%`} theme={theme} accent />
            <StatCard label="Total Samples" value={niceNumber(totalSamples)} theme={theme} />
            {accuracyStats.worstClass !== null && (
              <StatCard
                label="Worst Class"
                value={`${classes[accuracyStats.worstClass]} (${(accuracyStats.worstAccuracy * 100).toFixed(1)}%)`}
                theme={theme}
              />
            )}
            <StatCard label="Generated" value={timestamp.toLocaleString()} theme={theme} />
          </div>

          {/* Matrix table */}
          <div style={{
            borderRadius: '8px',
            border: `1px solid ${theme.modalBorder}`,
            overflow: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    backgroundColor: theme.modalHeaderBg,
                    color: theme.gray600,
                    fontWeight: 600,
                    fontSize: '11px',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    borderBottom: `1px solid ${theme.modalBorder}`,
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                  }}>
                    Real / Predicted
                  </th>
                  {classes.map((className: string, i: number) => (
                    <th key={i} style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      backgroundColor: theme.modalHeaderBg,
                      color: theme.gray700,
                      fontWeight: 600,
                      fontSize: '12px',
                      borderBottom: `1px solid ${theme.modalBorder}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {className}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row: number[], rowIndex: number) => {
                  const rowMax = Math.max(...row);
                  return (
                    <tr key={rowIndex}>
                      <td style={{
                        padding: '10px 12px',
                        fontWeight: 600,
                        color: theme.gray700,
                        backgroundColor: theme.bgSecondary,
                        borderBottom: rowIndex < matrix.length - 1 ? `1px solid ${theme.modalBorder}` : 'none',
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        whiteSpace: 'nowrap',
                      }}>
                        {classes[rowIndex] || ''}
                      </td>
                      {row.map((value: number, colIndex: number) => {
                        const isDiagonal = rowIndex === colIndex;
                        const intensity = rowMax > 0 ? value / rowMax : 0;
                        return (
                          <td key={colIndex} style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                            color: isDiagonal ? theme.primary : theme.gray900,
                            fontWeight: isDiagonal ? 700 : 400,
                            backgroundColor: isDiagonal
                              ? `${theme.primary}${Math.round(intensity * 20).toString(16).padStart(2, '0')}`
                              : 'transparent',
                            borderBottom: rowIndex < matrix.length - 1 ? `1px solid ${theme.modalBorder}` : 'none',
                          }}>
                            {niceNumber(value)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ModalAnimations />
    </div>
  );
};

/** Reusable stat card */
function StatCard({ label, value, theme, accent }: {
  label: string;
  value: string;
  theme: any;
  accent?: boolean;
}) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: '8px',
      backgroundColor: accent ? theme.primaryPale : theme.bgSecondary,
      border: `1px solid ${accent ? theme.primaryLight : theme.modalBorder}`,
    }}>
      <div style={{ fontSize: '11px', color: theme.gray500, fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: accent ? theme.primary : theme.gray900 }}>
        {value}
      </div>
    </div>
  );
}

/** Close button used in header */
function CloseButton({ theme, onClose }: { theme: any; onClose: () => void }) {
  return (
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
  );
}

/** Shared keyframe animations */
function ModalAnimations() {
  return (
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
  );
}

export default ConfusionMatrixModal;

import React, { useEffect, useState } from 'react';
import { useSegmentationStore } from '../stores/segmentationStore';
import { useTheme } from '../contexts/ThemeContext';

interface ImageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImageMetadata {
  [key: string]: string | number;
}

/**
 * Image Info Modal Component
 * 
 * Displays image thumbnail and metadata information.
 * Themed to match the IRIS Light/Dark design system.
 */
const ImageInfoModal: React.FC<ImageInfoModalProps> = ({ isOpen, onClose }) => {
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  
  const { currentImageId, apiUrls } = useSegmentationStore();

  useEffect(() => {
    if (isOpen) {
      const fetchMetadata = async () => {
        const imageId = currentImageId;
        const mainUrl = apiUrls?.main;

        if (!imageId || !mainUrl) {
          setError('Image ID not available');
          return;
        }

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`${mainUrl}metadata/${imageId}?safe_html=True`);
          if (response.status >= 400) {
            setError(await response.text());
          } else {
            setMetadata(await response.json());
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load metadata');
        } finally {
          setLoading(false);
        }
      };
      fetchMetadata();
    }
  }, [isOpen, currentImageId, apiUrls]);

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

  const imageId = currentImageId || 'Unknown';
  const mainUrl = apiUrls?.main || '';

  return (
    <div
      data-testid="image-info-modal"
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
          width: '480px',
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{
              fontSize: '15px',
              fontWeight: 600,
              color: theme.gray900,
              letterSpacing: '-0.01em',
            }}>
              {imageId}
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
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Thumbnail */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <img
              src={`${mainUrl}thumbnail/${imageId}?size=256x256`}
              alt={`Thumbnail of ${imageId}`}
              style={{
                maxWidth: '256px',
                maxHeight: '256px',
                borderRadius: '8px',
                border: `1px solid ${theme.modalBorder}`,
                backgroundColor: theme.bgTertiary,
              }}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: theme.gray500,
              fontSize: '13px',
            }}>
              Loading metadata...
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: theme.alertPale,
              color: theme.alert,
              fontSize: '13px',
              border: `1px solid ${theme.alertLight}`,
            }}>
              {error}
            </div>
          )}

          {/* Metadata table */}
          {metadata && (
            <div style={{
              borderRadius: '8px',
              border: `1px solid ${theme.modalBorder}`,
              overflow: 'hidden',
            }}>
              {Object.entries(metadata).map(([key, value], index) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    padding: '10px 14px',
                    fontSize: '13px',
                    borderBottom: index < Object.entries(metadata).length - 1
                      ? `1px solid ${theme.modalBorder}`
                      : 'none',
                    backgroundColor: index % 2 === 0 ? 'transparent' : theme.bgSecondary,
                  }}
                >
                  <span style={{
                    fontWeight: 600,
                    color: theme.gray700,
                    minWidth: '120px',
                    flexShrink: 0,
                  }}>
                    {key}
                  </span>
                  <span style={{ color: theme.gray900, wordBreak: 'break-word' }}>
                    {key === 'location' ? (
                      <>
                        {String(value)}{' '}
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`https://www.google.com/maps/search/?api=1&query=${String(value).replace('[', '').replace(']', '').replace(' ', '')}`}
                          style={{
                            color: theme.primary,
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          Show on map
                        </a>
                      </>
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
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

export default ImageInfoModal;

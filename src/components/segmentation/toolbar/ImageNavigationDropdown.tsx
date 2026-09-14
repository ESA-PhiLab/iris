/**
 * Image Navigation Dropdown Component
 * 
 * Displays current image name and allows navigation to any image in the project.
 * Shows annotation status and thumbnail preview for each image.
 * 
 * Uses Zustand store as single source of truth for image list.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSegmentationStore } from '../../../stores/segmentationStore';
import { useTheme } from '../../../contexts/ThemeContext';

interface ImageNavigationDropdownProps {
  onNavigate: (imageId: string) => void;
}

export const ImageNavigationDropdown: React.FC<ImageNavigationDropdownProps> = ({
  onNavigate,
}) => {
  const { images, currentImageId } = useSegmentationStore();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleImageSelect = (imageId: string) => {
    setIsOpen(false);
    if (imageId !== currentImageId) {
      onNavigate(imageId);
    }
  };

  const getStatusIcon = (image: { has_user_annotation: boolean; has_any_annotation: boolean }) => {
    if (image.has_user_annotation) {
      return '✓'; // User has annotated
    } else if (image.has_any_annotation) {
      return '○'; // Others have annotated
    }
    return ''; // No annotations
  };

  const getStatusColor = (image: { has_user_annotation: boolean; has_any_annotation: boolean }) => {
    if (image.has_user_annotation) {
      return theme.statusSuccess; // User has annotated - green
    } else if (image.has_any_annotation) {
      return theme.statusInfo; // Others have annotated - blue
    }
    return theme.gray500; // No annotations - gray
  };

  const getThumbnailUrl = (imageId: string) => {
    // Use the same thumbnail endpoint as ImageInfoModal
    return `/thumbnail/${imageId}?size=32x32`;
  };

  return (
    <div
      className="toolbutton icon_button image-navigation-dropdown"
      ref={dropdownRef as React.RefObject<HTMLDivElement>}
      style={{ 
        width: '220px', 
        position: 'relative', 
        listStyle: 'none',
        backgroundColor: theme.buttonSecondaryBg,
        border: `1px solid ${theme.buttonSecondaryBorder}`,
        borderRadius: '6px',
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          lineHeight: '28px',
          fontSize: '14px',
          fontWeight: '500',
          color: theme.buttonSecondaryText,
        }}
        title="Select image to navigate"
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentImageId}
        </span>
        <span style={{ marginLeft: '8px', fontSize: '12px', color: theme.buttonSecondaryText }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div 
          className="image-dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: theme.modalBg,
            border: `1px solid ${theme.modalBorder}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {images.length === 0 ? (
            <div 
              className="image-dropdown-loading"
              style={{
                padding: '16px',
                textAlign: 'center',
                color: theme.gray600,
                fontSize: '13px',
              }}
            >
              No images loaded
            </div>
          ) : (
            <>
              <div 
                className="image-dropdown-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: `1px solid ${theme.modalBorder}`,
                  backgroundColor: theme.modalHeaderBg,
                  fontSize: '11px',
                  fontWeight: '600',
                  color: theme.gray600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <span>Image</span>
                <span>Status</span>
              </div>
              <div className="image-dropdown-list">
                {images.map((image) => {
                  const isCurrent = image.image_id === currentImageId;
                  const statusColor = getStatusColor(image);
                  
                  return (
                    <div
                      key={image.image_id}
                      className="image-dropdown-item"
                      onClick={() => handleImageSelect(image.image_id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: isCurrent ? theme.primaryPale : 'transparent',
                        borderLeft: isCurrent ? `3px solid ${theme.primary}` : '3px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <img 
                        className="image-thumbnail"
                        src={getThumbnailUrl(image.image_id)}
                        alt=""
                        style={{
                          width: '32px',
                          height: '32px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: `1px solid ${theme.modalBorder}`,
                        }}
                        onError={(e) => {
                          // Hide image if it fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span 
                        className="image-name" 
                        style={{ 
                          flex: 1,
                          color: theme.gray900, 
                          fontSize: '14px', 
                          fontWeight: isCurrent ? '600' : 'normal',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {image.image_id}
                      </span>
                      <span 
                        className="image-status" 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '14px',
                          color: statusColor,
                          fontWeight: '600',
                        }}
                        title={
                          image.has_user_annotation
                            ? 'You have annotated this image'
                            : image.has_any_annotation
                            ? `${image.annotation_count} annotation(s) by others`
                            : 'No annotations'
                        }
                      >
                        {getStatusIcon(image)}
                        {image.annotation_count > 0 && (
                          <span 
                            className="annotation-count"
                            style={{
                              fontSize: '11px',
                              color: theme.gray600,
                            }}
                          >
                            ({image.annotation_count})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

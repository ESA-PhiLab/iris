/**
 * React ViewPort Component
 *
 * This component replaces the legacy ViewPort class.
 * It manages a single view with multiple layers (RGB, Mask, Preview, etc.).
 */

import React, { useRef, useState } from 'react';
import { ViewConfig } from '../../stores/viewManagerStore';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import { useTheme } from '../../contexts/ThemeContext';
import ReactRGBLayer from './layers/ReactRGBLayer';
import ReactMaskLayer from './layers/ReactMaskLayer';
import ReactPreviewLayer from './layers/ReactPreviewLayer';
import ReactBingLayer from './layers/ReactBingLayer';

interface ReactViewPortProps {
  view: ViewConfig;
  index: number;
  width: number;
  height: number;
  showControls: boolean;
  imageId: string;
  onImageLocationChange: (location: [number, number]) => void;
  // PHASE 3A: New zoom/pan/interaction props
  zoomLevel?: number;
  panOffset?: { x: number; y: number };
  isActive?: boolean;
  onViewActivate?: () => void;
}

const ReactViewPort: React.FC<ReactViewPortProps> = ({
  view,
  index,
  width,
  height,
  showControls,
  imageId,
  onImageLocationChange,
  // PHASE 3A: New props with defaults
  zoomLevel = 1.0,
  panOffset = { x: 0, y: 0 },
  isActive = false,
  onViewActivate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedViewName, setSelectedViewName] = useState(view.name);
  const { theme } = useTheme();

  const {
    views,
    addView,
    removeView,
    replaceView,
    getCurrentViews,
  } = useViewManagerStore();

  const currentViews = getCurrentViews();
  const canRemove = currentViews.length > 1;

  // Handle view selection change
  const handleViewChange = (newViewName: string) => {
    setSelectedViewName(newViewName);
    replaceView(index, newViewName);
  };

  // Handle add view
  const handleAddView = () => {
    addView(view.name, index);
  };

  // Handle remove view
  const handleRemoveView = () => {
    if (canRemove) {
      removeView(index);
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    flex: '1 1 0',
    minWidth: '0',
    minHeight: '0',
    height: '100%',
    maxHeight: '100%',
    aspectRatio: '1 / 1',
    border: isActive ? `2px solid ${theme.primary}` : `1px solid ${theme.panelBorder}`,
    backgroundColor: isActive ? theme.selectionBg : 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    overflow: 'hidden',
  };

  const layersContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  const controlsStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(180deg, ${theme.modalOverlay} 0%, transparent 40%, transparent 70%, ${theme.modalOverlay} 100%)`,
    visibility: showControls ? 'visible' : 'hidden',
    pointerEvents: showControls ? 'auto' : 'none',
    opacity: showControls ? 1 : 0,
    transition: 'opacity 0.15s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '8px',
    boxSizing: 'border-box',
  };

  const topRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: '28px',
    padding: '0 8px',
    fontSize: '12px',
    fontFamily: 'inherit',
    fontWeight: 500,
    color: theme.inputText,
    backgroundColor: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: '6px',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${encodeURIComponent(theme.gray500)}'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight: '24px',
  };

  const iconButtonStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: theme.buttonSecondaryText,
    backgroundColor: theme.buttonSecondaryBg,
    border: `1px solid ${theme.buttonSecondaryBorder}`,
    borderRadius: '6px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    transition: 'background-color 0.15s ease',
    flexShrink: 0,
  };

  const descriptionStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '11px',
    fontWeight: 400,
    lineHeight: '1.4',
    color: theme.tooltipText,
    backgroundColor: theme.tooltipBg,
    padding: '4px 8px',
    borderRadius: '4px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const viewLabelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '6px',
    left: '6px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    color: theme.tooltipText,
    backgroundColor: theme.tooltipBg,
    padding: '2px 6px',
    borderRadius: '3px',
    opacity: 0.85,
    pointerEvents: 'none',
    zIndex: 500,
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onClick={() => onViewActivate && onViewActivate()}
    >
      {/* Layers Container */}
      <div style={layersContainerStyle}>
        {/* RGB/Image Layer */}
        {view.type === 'image' && (
          <ReactRGBLayer
            view={view}
            width={width}
            height={height}
            imageId={imageId}
            zIndex={1}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
          />
        )}

        {/* Bing Map Layer */}
        {view.type === 'bingmap' && (
          <ReactBingLayer
            view={view}
            width={width}
            height={height}
            onLocationChange={onImageLocationChange}
            zIndex={1}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
          />
        )}

        {/* Mask Layer (only for image views) */}
        {view.type === 'image' && (
          <ReactMaskLayer
            view={view}
            width={width}
            height={height}
            zIndex={2}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
          />
        )}

        {/* Preview Layer (only for image views) */}
        {view.type === 'image' && (
          <ReactPreviewLayer
            view={view}
            width={width}
            height={height}
            zIndex={3}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
          />
        )}
      </div>

      {/* View name label (always visible when controls hidden) */}
      {!showControls && (
        <div style={viewLabelStyle}>{view.name}</div>
      )}

      {/* Controls Overlay */}
      <div style={controlsStyle}>
        {/* Top row: selector + buttons */}
        <div style={topRowStyle}>
          <select
            value={selectedViewName}
            onChange={(e) => handleViewChange(e.target.value)}
            style={selectStyle}
          >
            {Object.values(views).map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>

          {canRemove && (
            <button
              style={iconButtonStyle}
              onClick={handleRemoveView}
              title="Remove view"
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg; }}
            >
              &minus;
            </button>
          )}

          <button
            style={iconButtonStyle}
            onClick={handleAddView}
            title="Add view"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg; }}
          >
            +
          </button>
        </div>

        {/* Bottom: description */}
        {view.description && (
          <p style={descriptionStyle} title={view.description}>
            {view.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReactViewPort;

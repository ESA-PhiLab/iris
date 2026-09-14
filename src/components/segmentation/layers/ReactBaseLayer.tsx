/**
 * React Base Layer Component
 * 
 * Base class for all view layers (RGB, Mask, Preview, etc.).
 * This replaces the legacy ViewLayer class.
 */

import React, { useRef, useEffect } from 'react';
import { ViewConfig } from '../../../stores/viewManagerStore';

export interface ReactBaseLayerProps {
  view: ViewConfig;
  width: number;
  height: number;
  zIndex: number;
  className?: string;
  style?: React.CSSProperties;
}

// ReactBaseLayerState interface removed - not currently used

const ReactBaseLayer: React.FC<ReactBaseLayerProps & { 
  children?: React.ReactNode;
  onRender?: () => void;
  onSizeChange?: (width: number, height: number) => void;
  onPositionChange?: (x: number, y: number) => void;
  onImageLocationChange?: (location: [number, number]) => void;
}> = ({
  width,
  height,
  zIndex,
  className = '',
  style = {},
  children,
  onRender,
  onSizeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle size changes
  useEffect(() => {
    if (onSizeChange) {
      onSizeChange(width, height);
    }
  }, [width, height, onSizeChange]);
  
  // Handle render calls
  useEffect(() => {
    if (onRender) {
      onRender();
    }
  }, [onRender]);
  
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%', // Use percentage instead of fixed pixels
    height: '100%', // Use percentage instead of fixed pixels
    zIndex,
    ...style,
  };
  
  return (
    <div 
      ref={containerRef}
      className={`react-base-layer ${className}`}
      style={containerStyle}
    >
      {children}
    </div>
  );
};

export default ReactBaseLayer;
/**
 * React Mask Layer Component
 * 
 * This component replaces the legacy MaskLayer class.
 * It handles mask rendering and visibility.
 * 
 * This layer uses trackTransforms (like all legacy CanvasLayer subclasses)
 * so that zoom/pan applied to all view-canvas elements keeps the mask
 * aligned with the RGB image underneath.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useSegmentationStore } from '../../../stores/segmentationStore';
import { addTrackTransforms } from '../../../utils/coordinateTransform';
import { applyViewTransform } from '../../../utils/viewTransform';
import { useViewManagerStore } from '../../../stores/viewManagerStore';
import ReactBaseLayer, { ReactBaseLayerProps } from './ReactBaseLayer';

interface ReactMaskLayerProps extends Omit<ReactBaseLayerProps, 'children'> {
  zoomLevel?: number;
  panOffset?: { x: number; y: number };
}

const ReactMaskLayer: React.FC<ReactMaskLayerProps> = ({
  view,
  width,
  height,
  zIndex,
  className = '',
  style = {},
  zoomLevel: _zoomLevel = 1.0,
  panOffset: _panOffset = { x: 0, y: 0 },
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { showMask } = useSegmentationStore();
  const currentImageId = useSegmentationStore((state) => state.currentImageId);
  
  /**
   * Set up canvas with trackTransforms and base scale.
   * trackTransforms is required so the zoom/move loops in viewManagerStore
   * can apply ctx.translate/ctx.scale and constrain_view works (needs getCanvasCoords).
   */
  const setupCanvas = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageShape: [number, number]) => {
    ctx.imageSmoothingEnabled = false;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = '';
    
    // Apply trackTransforms so zoom/pan works on this canvas
    addTrackTransforms(ctx);
    
    // Set initial scale (canvas pixels → image pixels), carrying over any
    // zoom/pan recorded in the store so remounts keep the current view.
    applyViewTransform(ctx, canvas, imageShape, useViewManagerStore.getState().viewTransform);
  }, []);

  // Render mask function - matches legacy MaskLayer exactly
  const renderMask = useCallback((bbox?: [number, number, number, number]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = window as any;
    const hiddenMask = w.getHiddenMaskCanvasFromStore ? w.getHiddenMaskCanvasFromStore() : null;
    if (!hiddenMask) return;
    
    const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
    if (!maskArea) return;
    
    const imageShape = w.getImageShapeFromStore ? w.getImageShapeFromStore() : null;
    if (!imageShape) return;
    
    if ((window as any).IRIS_DEBUG) {
      console.log('[ReactMaskLayer] renderMask:', {
        bbox,
        hiddenMaskSize: [hiddenMask.width, hiddenMask.height],
        maskArea,
        imageShape,
        canvasSize: [canvas.width, canvas.height]
      });
    }
    
    if (!bbox) {
      // Full redraw: clear in image coords then draw hidden mask
      ctx.clearRect(0, 0, imageShape[0], imageShape[1]);
      ctx.drawImage(hiddenMask, maskArea[0], maskArea[1]);
    } else {
      // Partial redraw
      ctx.clearRect(
        bbox[0] + maskArea[0],
        bbox[1] + maskArea[1],
        bbox[2], bbox[3]
      );
      ctx.drawImage(
        hiddenMask,
        bbox[0], bbox[1], bbox[2], bbox[3],
        bbox[0] + maskArea[0], bbox[1] + maskArea[1],
        bbox[2], bbox[3]
      );
    }
  }, []);
  
  // CRITICAL: Clear visible canvas when image changes to prevent stale mask display
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    if ((window as any).IRIS_DEBUG) {
      console.log('[ReactMaskLayer] Canvas cleared for image change:', currentImageId);
    }
  }, [currentImageId]);

  // Handle browser bfcache restoration
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
        }
        renderMask();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [renderMask]);

  // Handle canvas size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      
      const w = window as any;
      const imageShape = w.getImageShapeFromStore ? w.getImageShapeFromStore() : w.vars?.image_shape;
      
      let actualWidth = containerWidth;
      let actualHeight = containerHeight;
      
      if (imageShape) {
        const imageWidth = imageShape[1];
        const imageHeight = imageShape[0];
        const imageAspectRatio = imageWidth / imageHeight;
        const containerAspectRatio = containerWidth / containerHeight;
        
        if (containerAspectRatio > imageAspectRatio) {
          actualWidth = containerHeight * imageAspectRatio;
          actualHeight = containerHeight;
        } else {
          actualWidth = containerWidth;
          actualHeight = containerWidth / imageAspectRatio;
        }
      }
      
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      canvas.style.left = `${(containerWidth - actualWidth) / 2}px`;
      canvas.style.top = `${(containerHeight - actualHeight) / 2}px`;
      canvas.style.width = `${actualWidth}px`;
      canvas.style.height = `${actualHeight}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx && imageShape) {
        setupCanvas(canvas, ctx, imageShape);
      }
      
      renderMask();
    };
    
    updateCanvasSize();
    
    const container = canvas.parentElement;
    if (container) {
      const resizeObserver = new ResizeObserver(() => updateCanvasSize());
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }
  }, [width, height, renderMask, setupCanvas]);
  
  // Handle mask visibility changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.display = showMask ? 'block' : 'none';
      if (showMask) renderMask();
    }
  }, [showMask, renderMask]);
  
  // Expose render function for legacy compatibility
  useEffect(() => {
    const w = window as any;
    if (!w.reactMaskLayers) w.reactMaskLayers = [];
    
    const layerInterface = {
      render: renderMask,
      view,
      type: 'mask',
      container: canvasRef.current,
    };
    w.reactMaskLayers.push(layerInterface);
    
    return () => {
      const index = w.reactMaskLayers.indexOf(layerInterface);
      if (index > -1) w.reactMaskLayers.splice(index, 1);
    };
  }, [renderMask, view]);
  
  // Listen for zoom/transform changes and re-render
  useEffect(() => {
    const handleTransformChange = () => renderMask();
    window.addEventListener('iris-transform-change', handleTransformChange);
    return () => window.removeEventListener('iris-transform-change', handleTransformChange);
  }, [renderMask]);
  
  // Listen for legacy mask render calls
  useEffect(() => {
    const handleLegacyRender = (event: CustomEvent) => {
      renderMask(event.detail?.bbox);
    };
    window.addEventListener('react-mask-render', handleLegacyRender as EventListener);
    return () => window.removeEventListener('react-mask-render', handleLegacyRender as EventListener);
  }, [renderMask]);
  
  // Initial render when mask data is available
  useEffect(() => {
    const w = window as any;
    const hiddenMask = w.getHiddenMaskCanvasFromStore ? w.getHiddenMaskCanvasFromStore() : null;
    const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : null;
    const imageShape = w.getImageShapeFromStore ? w.getImageShapeFromStore() : null;
    
    if (hiddenMask && maskArea && imageShape) renderMask();
  }, [renderMask]);
  
  // Listen for mask data loading events
  useEffect(() => {
    const handleMaskLoaded = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const container = canvas.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      const w = window as any;
      const imageShape = w.getImageShapeFromStore ? w.getImageShapeFromStore() : null;
      
      if (imageShape) {
        const imageWidth = imageShape[1];
        const imageHeight = imageShape[0];
        const imageAspectRatio = imageWidth / imageHeight;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let actualWidth: number, actualHeight: number;
        if (containerAspectRatio > imageAspectRatio) {
          actualWidth = containerHeight * imageAspectRatio;
          actualHeight = containerHeight;
        } else {
          actualWidth = containerWidth;
          actualHeight = containerWidth / imageAspectRatio;
        }
        
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        canvas.style.left = `${(containerWidth - actualWidth) / 2}px`;
        canvas.style.top = `${(containerHeight - actualHeight) / 2}px`;
        canvas.style.width = `${actualWidth}px`;
        canvas.style.height = `${actualHeight}px`;
        
        const ctx = canvas.getContext('2d');
        if (ctx) setupCanvas(canvas, ctx, imageShape);
      }
      
      renderMask();
    };
    
    window.addEventListener('iris-mask-loaded', handleMaskLoaded);
    return () => window.removeEventListener('iris-mask-loaded', handleMaskLoaded);
  }, [renderMask, setupCanvas]);
  
  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    display: showMask ? 'block' : 'none',
    backgroundColor: 'transparent',
    cursor: 'crosshair',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    KhtmlUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    userSelect: 'none',
    ...style,
  };
  
  return (
    <ReactBaseLayer
      view={view}
      width={width}
      height={height}
      zIndex={zIndex}
      className={`react-mask-layer ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        className="view-canvas mask-canvas"
      />
    </ReactBaseLayer>
  );
};

export default ReactMaskLayer;

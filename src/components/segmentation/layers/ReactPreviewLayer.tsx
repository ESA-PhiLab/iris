/**
 * React Preview Layer Component
 * 
 * This component replaces the legacy PreviewLayer class.
 * It handles drawing preview (cursor, tool preview, mask area boundaries).
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import ReactBaseLayer, { ReactBaseLayerProps } from './ReactBaseLayer';
import { createCoordinateTransform, updateCursorCoords, addTrackTransforms, CoordinateTransform } from '../../../utils/coordinateTransform';
import { applyViewTransform } from '../../../utils/viewTransform';
import { useViewManagerStore } from '../../../stores/viewManagerStore';
import { useSegmentationStore } from '../../../stores/segmentationStore';

interface ReactPreviewLayerProps extends Omit<ReactBaseLayerProps, 'children'> {
  // Additional props specific to preview layer
  zoomLevel?: number;
  panOffset?: { x: number; y: number };
}

const ReactPreviewLayer: React.FC<ReactPreviewLayerProps> = ({
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
  const [transform, setTransform] = useState<CoordinateTransform | null>(null);
  
  // Get tool size from React store (primary source)
  const toolSize = useSegmentationStore((state) => state.toolSize);
  
  // Get tool shape from React store (primary source)
  const toolShape = useSegmentationStore((state) => state.toolShape);
  
  // Get cursor image from React store (primary source)
  const cursorImage = useSegmentationStore((state) => state.cursorImage);
  
  // Render preview function
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get legacy vars for cursor and tool data
    const w = window as any;
    
    const cursorImage = (window as any).getCursorImageFromStore ? 
      (window as any).getCursorImageFromStore() : w.vars?.cursor_image;
    
    const imageShape = (window as any).getImageShapeFromStore ? 
      (window as any).getImageShapeFromStore() : w.vars?.image_shape;
    
    if (!cursorImage) {
      console.warn('⚠️ [IRIS Migration] ReactPreviewLayer: No cursor image available from React store or legacy vars');
      return;
    }
    
    if (!imageShape) {
      console.warn('⚠️ [IRIS Migration] ReactPreviewLayer: No image shape available from React store or legacy vars');
      return;
    }
    
    // Clear canvas using canvas dimensions (not image dimensions) to respect current zoom/pan
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity for clearing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore(); // Restore the zoom/pan transformation
    
    // Get tool offset (from legacy get_tool_offset function)
    let offset = { x: 0, y: 0 };
    if (w.get_tool_offset) {
      offset = w.get_tool_offset();
    }
    
    // The cursor coordinates are already in image space, and the canvas transformation
    // will be applied automatically when we draw. We just need to draw at the image coordinates.
    const cursorX = cursorImage[0] + offset.x;
    const cursorY = cursorImage[1] + offset.y;
    
    // CRITICAL FIX: Use toolSize directly - canvas transformation handles scaling automatically
    // This matches the legacy behavior exactly: no manual scaling needed
    
    // Draw tool cursor preview based on shape
    ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
    
    if (toolShape === 'round') {
      // Draw circular cursor
      const radius = toolSize / 2;
      const centerX = cursorX + radius;
      const centerY = cursorY + radius;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Draw square cursor (default)
      ctx.fillRect(cursorX, cursorY, toolSize, toolSize);
    }
    
    // Draw mask area boundaries
    const maskArea = window.getMaskAreaFromStore ? window.getMaskAreaFromStore() : w.vars?.mask_area;
    const maskShape = window.getMaskShapeFromStore ? window.getMaskShapeFromStore() : w.vars?.mask_shape;
    
    if (maskArea && maskShape) {
      ctx.beginPath();
      
      // Line width depends on number of views
      const views = (window as any).getConfigSectionFromStore ? 
        (window as any).getConfigSectionFromStore('views') : (() => {
          console.warn('[IRIS Migration] ⚠️ FALLBACK: Using legacy vars.config.views for line width - React store not available');
          return w.vars?.config?.views;
        })();
      
      const viewCount = views ? (Array.isArray(views) ? views.length : Object.keys(views).length) : 0;
      if (viewCount < 2) {
        ctx.lineWidth = 3;
      } else {
        ctx.lineWidth = 2;
      }
      
      ctx.strokeStyle = "red";
      ctx.setLineDash([5, 15]);
      
      // Mask area coordinates are in image space - let canvas transform handle the scaling
      const maskX = maskArea[0];
      const maskY = maskArea[1];
      const maskWidth = maskShape[0];
      const maskHeight = maskShape[1];
      
      ctx.rect(maskX, maskY, maskWidth, maskHeight);
      ctx.stroke();
    } else {
      console.warn('[IRIS Migration] ReactPreviewLayer: No mask area or mask shape available for rendering');
    }
    
  }, [toolSize, toolShape, cursorImage]); // Re-render when toolSize, toolShape, or cursorImage changes
  
  // Handle canvas size changes and coordinate transformation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const updateCanvasSize = () => {
      // Get actual container dimensions instead of using fixed width/height props
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        
        const w = window as any;
        const imageShape = (window as any).getImageShapeFromStore ? 
          (window as any).getImageShapeFromStore() : w.vars?.image_shape;
        
        let actualWidth = containerWidth;
        let actualHeight = containerHeight;
        
        // Maintain aspect ratio based on image dimensions
        if (imageShape) {
          const imageWidth = imageShape[1];
          const imageHeight = imageShape[0];
          const imageAspectRatio = imageWidth / imageHeight;
          const containerAspectRatio = containerWidth / containerHeight;
          
          if (containerAspectRatio > imageAspectRatio) {
            // Container is wider than image - fit to height
            actualWidth = containerHeight * imageAspectRatio;
            actualHeight = containerHeight;
          } else {
            // Container is taller than image - fit to width
            actualWidth = containerWidth;
            actualHeight = containerWidth / imageAspectRatio;
          }
          
          // Set canvas internal dimensions to maintain aspect ratio
          canvas.width = actualWidth;
          canvas.height = actualHeight;
          
          // Center the canvas in the container
          canvas.style.left = `${(containerWidth - actualWidth) / 2}px`;
          canvas.style.top = `${(containerHeight - actualHeight) / 2}px`;
          canvas.style.width = `${actualWidth}px`;
          canvas.style.height = `${actualHeight}px`;
          
          const newTransform = createCoordinateTransform(
            actualWidth, actualHeight,
            imageWidth, imageHeight
          );
          setTransform(newTransform);
          
          // Disable image smoothing for pixel-perfect rendering
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = '';
            
            // Add full canvas transformation tracking (enables zoom/pan)
            // This creates getWorldCoords and getCanvasCoords that handle zoom/pan properly
            addTrackTransforms(ctx);
            
            // Rebuild the transformation when the canvas is (re)created or resized,
            // carrying over any zoom/pan recorded in the store.
            applyViewTransform(ctx, canvas, imageShape, useViewManagerStore.getState().viewTransform);
          }
        }
      }
    };
    
    // Initial size update
    updateCanvasSize();
    
    // Watch for container size changes using ResizeObserver
    const container = canvas.parentElement;
    if (container) {
      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      
      resizeObserver.observe(container);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [width, height]); // REMOVED renderPreview dependency to prevent transformation reset
  
  // Separate effect for rendering that doesn't reset transformations
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);
  
  // Add mouse event listeners with proper coordinate transformation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !transform) return;
    
    // Wait for legacy functions to be available
    const waitForLegacyFunctions = () => {
      const w = window as any;
      return w.mouse_wheel && w.mouse_move && w.mouse_down && w.mouse_up && w.mouse_enter;
    };
    
    if (!waitForLegacyFunctions()) {
      if ((window as any).IRIS_DEBUG) console.log('[ReactPreviewLayer] Waiting for legacy functions to load...');
      const checkInterval = setInterval(() => {
        if (waitForLegacyFunctions()) {
          if ((window as any).IRIS_DEBUG) console.log('[ReactPreviewLayer] Legacy functions now available, setting up event handlers');
          clearInterval(checkInterval);
          setupEventHandlers();
        }
      }, 100); // Check every 100ms
      
      // Cleanup interval if component unmounts
      return () => clearInterval(checkInterval);
    } else {
      if ((window as any).IRIS_DEBUG) console.log('[ReactPreviewLayer] Legacy functions already available, setting up event handlers');
      setupEventHandlers();
    }
    
    function setupEventHandlers() {
      // Create wrapped mouse event handlers that update coordinates properly
      const handleMouseMove = (event: MouseEvent) => {
        try {
          if (canvas) {
            updateCursorCoords(canvas, event);
          }
          
          // Call legacy mouse_move handler
          const w = window as any;
          if (w.mouse_move && canvas) {
            w.mouse_move.call(canvas, event);
          } else {
            console.warn('[ReactPreviewLayer] Legacy mouse_move function not available');
          }
        } catch (error) {
          console.error('Error in mouse move handler:', error);
        }
      };
      
      const handleMouseDown = (event: MouseEvent) => {
        try {
          if (canvas) {
            updateCursorCoords(canvas, event);
          }
          
          if ((window as any).IRIS_DEBUG) {
            console.log('[ReactPreviewLayer] Mouse down event:', {
              buttons: event.buttons,
              hasLegacyMouseDown: !!(window as any).mouse_down
            });
          }
          
          // Call legacy mouse_down handler
          const w = window as any;
          if (w.mouse_down && canvas) {
            w.mouse_down.call(canvas, event);
          } else {
            console.warn('[ReactPreviewLayer] Legacy mouse_down function not available');
          }
        } catch (error) {
          console.error('Error in mouse down handler:', error);
        }
      };
      
      const handleMouseUp = (event: MouseEvent) => {
        try {
          // Call legacy mouse_up handler
          const w = window as any;
          if (w.mouse_up && canvas) {
            w.mouse_up.call(canvas, event);
          }
        } catch (error) {
          console.error('Error in mouse up handler:', error);
        }
      };
      
      const handleMouseEnter = (event: MouseEvent) => {
        if (canvas) {
          updateCursorCoords(canvas, event);
        }
        
        // Call legacy mouse_enter handler
        const w = window as any;
        if (w.mouse_enter && canvas) {
          w.mouse_enter.call(canvas, event);
        }
      };
      
      const handleMouseWheel = (event: WheelEvent) => {
        if ((window as any).IRIS_DEBUG) {
          console.log('[ReactPreviewLayer] Mouse wheel event:', {
            deltaY: event.deltaY,
            wheelDelta: (event as any).wheelDelta,
            hasLegacyMouseWheel: !!(window as any).mouse_wheel
          });
        }
        
        // Call legacy mouse_wheel handler
        const w = window as any;
        if (w.mouse_wheel && canvas) {
          w.mouse_wheel.call(canvas, event);
        } else {
          console.warn('[ReactPreviewLayer] Legacy mouse_wheel function not available');
        }
      };
      
      // Add event listeners only if canvas exists
      if (canvas) {
        canvas.addEventListener("mousemove", handleMouseMove, { passive: false });
        canvas.addEventListener("mousedown", handleMouseDown, false);
        canvas.addEventListener("mouseup", handleMouseUp, false);
        canvas.addEventListener("mouseenter", handleMouseEnter, { passive: false });
        canvas.addEventListener("wheel", handleMouseWheel, { passive: false });
        
        // Store cleanup function
        (canvas as any)._cleanupEventHandlers = () => {
          if (canvas) {
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mouseup", handleMouseUp);
            canvas.removeEventListener("mouseenter", handleMouseEnter);
            canvas.removeEventListener("wheel", handleMouseWheel);
          }
        };
      }
    }
    
    return () => {
      // Cleanup event listeners
      if ((canvas as any)._cleanupEventHandlers) {
        (canvas as any)._cleanupEventHandlers();
      }
    };
  }, [transform]);
  
  // Expose render function for legacy compatibility
  useEffect(() => {
    const w = window as any;
    if (!w.reactPreviewLayers) {
      w.reactPreviewLayers = [];
    }
    
    const layerInterface = {
      render: renderPreview,
      view: view,
      type: 'preview',
      container: canvasRef.current,
    };
    
    w.reactPreviewLayers.push(layerInterface);
    
    return () => {
      const index = w.reactPreviewLayers.indexOf(layerInterface);
      if (index > -1) {
        w.reactPreviewLayers.splice(index, 1);
      }
    };
  }, [renderPreview, view]);
  
  // Listen for zoom/transform changes and re-render
  useEffect(() => {
    const handleTransformChange = () => {
      // Don't reset transformation - just re-render with current zoom/pan state
      renderPreview();
    };
    
    // Listen for legacy zoom/transform events
    window.addEventListener('iris-transform-change', handleTransformChange);
    
    // Also listen for the legacy update_views event which is triggered after zoom
    const handleUpdateViews = () => {
      renderPreview();
    };
    
    window.addEventListener('iris-update-views', handleUpdateViews);
    
    return () => {
      window.removeEventListener('iris-transform-change', handleTransformChange);
      window.removeEventListener('iris-update-views', handleUpdateViews);
    };
  }, [renderPreview]);
  
  // Listen for legacy preview render calls
  useEffect(() => {
    const handleLegacyRender = () => {
      renderPreview();
    };
    
    window.addEventListener('react-preview-render', handleLegacyRender);
    
    return () => {
      window.removeEventListener('react-preview-render', handleLegacyRender);
    };
  }, [renderPreview]);
  
  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    display: 'block',
    backgroundColor: 'transparent',
    cursor: 'crosshair',
    pointerEvents: 'auto', // Allow mouse interactions
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
      className={`react-preview-layer ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        className="view-canvas preview-canvas"
      />
    </ReactBaseLayer>
  );
};

export default ReactPreviewLayer;
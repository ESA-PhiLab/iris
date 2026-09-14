/**
 * React ViewManager Component
 * 
 * This component replaces the legacy ViewManager class with a React-based implementation.
 * It manages multiple ViewPorts and their associated layers (RGB, Mask, Preview, etc.).
 * 
 * PHASE 3A: Enhanced with zoom/pan/canvas state management
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useViewManagerStore } from '../../stores/viewManagerStore';

import ReactViewPort from './ReactViewPort';

interface ReactViewManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

const ReactViewManager: React.FC<ReactViewManagerProps> = ({ 
  className = '',
  style = {} 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // PHASE 3A: Enhanced store subscriptions with new state
  const {
    currentGroup,
    viewWidth,
    viewHeight,
    showControls,
    imageId,
    // PHASE 3A: New zoom/pan/canvas state
    currentView,
    zoomLevel,
    panOffset,
    canvasDimensions,
    mousePosition,
    isMouseDown,
    isDragging,
    // Actions
    getCurrentViews,
    updateViewDimensions,
    setImageLocation,
    // PHASE 3A: New actions
    setCurrentView,
    updateCanvasDimensions,
    updateMousePosition,
    setMouseDown,
    setDragging,
    screenToImageCoordinates,
    imageToScreenCoordinates,
    getDebugInfo,
  } = useViewManagerStore();
  
  const currentViews = getCurrentViews();
  
  // PHASE 3A: Update canvas dimensions when container size changes
  useEffect(() => {
    const updateContainerDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        updateCanvasDimensions({
          width: rect.width,
          height: rect.height
        });
      }
      updateViewDimensions();
    };
    
    const handleResize = () => {
      updateContainerDimensions();
    };
    
    // Initial update
    updateContainerDimensions();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateViewDimensions, updateCanvasDimensions, currentViews.length]);
  
  // PHASE 3A: Mouse event handlers for canvas interaction
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      updateMousePosition({ x: mouseX, y: mouseY });
      
      // Sync with legacy vars during migration
      const w = window as any;
      if (w.vars) {
        w.vars.mouse_x = mouseX;
        w.vars.mouse_y = mouseY;
      }
    }
  }, [updateMousePosition]);
  
  const handleMouseDown = useCallback((_event: React.MouseEvent) => {
    setMouseDown(true);
    
    // Sync with legacy vars during migration
    const w = window as any;
    if (w.vars) {
      w.vars.mouse_down = true;
    }
  }, [setMouseDown]);
  
  const handleMouseUp = useCallback((_event: React.MouseEvent) => {
    setMouseDown(false);
    setDragging(false);
    
    // Sync with legacy vars during migration
    const w = window as any;
    if (w.vars) {
      w.vars.mouse_down = false;
      w.vars.dragging = false;
    }
  }, [setMouseDown, setDragging]);
  
  // Handle image location changes (for Bing maps, etc.)
  const handleImageLocationChange = useCallback((newLocation: [number, number]) => {
    setImageLocation(newLocation);
  }, [setImageLocation]);
  
  // PHASE 3A: Enhanced render function with zoom/pan support
  const renderAllViewPorts = useCallback(() => {
    // This will trigger re-render of all viewport canvases
    // Similar to the legacy vm.render() function
    // Now includes zoom/pan state from React store
    console.log('[ReactViewManager] Rendering all viewports with zoom/pan state:', {
      zoomLevel,
      panOffset,
      currentView,
      viewCount: currentViews.length
    });
  }, [zoomLevel, panOffset, currentView, currentViews.length]);
  
  // PHASE 3A: Expose enhanced functions to legacy code during migration
  useEffect(() => {
    const w = window as any;
    if (!w.reactViewManager) {
      w.reactViewManager = {};
    }
    
    // Enhanced legacy bridge with Phase 3A functions
    w.reactViewManager.render = renderAllViewPorts;
    w.reactViewManager.getZoom = () => zoomLevel;
    w.reactViewManager.getPan = () => panOffset;
    w.reactViewManager.getCurrentView = () => currentView;
    w.reactViewManager.getCanvasSize = () => canvasDimensions;
    w.reactViewManager.getMouse = () => mousePosition;
    w.reactViewManager.screenToImage = screenToImageCoordinates;
    w.reactViewManager.imageToScreen = imageToScreenCoordinates;
  }, [renderAllViewPorts, zoomLevel, panOffset, currentView, canvasDimensions, mousePosition, screenToImageCoordinates, imageToScreenCoordinates]);
  
  if (!imageId || currentViews.length === 0) {
    // PHASE 3A: Enhanced debug info with new state
    const debugInfo = {
      imageId,
      currentViewsLength: currentViews.length,
      currentView,
      zoomLevel,
      panOffset,
      canvasDimensions,
      storeDebugInfo: getDebugInfo(),
    };
    
    // Log the issue for debugging
    console.warn('⚠️ ReactViewManager: No views or image available', debugInfo);
    
    return (
      <div 
        ref={containerRef}
        className={`react-view-manager ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: '#666',
          fontSize: '12px',
          padding: '20px',
          ...style
        }}
      >
        <div style={{ marginBottom: '10px', fontSize: '14px' }}>
          No views configured or image not loaded
        </div>
        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#999' }}>
          Draw at least 10 pixels from two classes!
        </div>
        <details style={{ fontSize: '10px', color: '#999' }}>
          <summary>Debug Info (Phase 3A Enhanced)</summary>
          <pre style={{ marginTop: '5px', fontSize: '9px' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={`react-view-manager ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap', // Keep all views in one row
        gap: '0px',
        width: '100%',
        height: '100%',
        minHeight: '0', // Allow shrinking
        maxHeight: '100%', // Don't exceed parent
        position: 'relative',
        overflow: 'hidden', // Prevent overflow, force fit
        boxSizing: 'border-box', // Include padding/border in dimensions
        // PHASE 3A: Add cursor style based on interaction state
        cursor: isDragging ? 'grabbing' : (isMouseDown ? 'grab' : 'default'),
        ...style
      }}
      // PHASE 3A: Mouse event handlers for canvas interaction
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // Reset mouse state when leaving container
    >
      {currentViews.map((view, index) => (
        <ReactViewPort
          key={`${currentGroup}-${view.name}-${index}`}
          view={view}
          index={index}
          width={viewWidth}
          height={viewHeight}
          showControls={showControls}
          imageId={imageId}
          onImageLocationChange={handleImageLocationChange}
          // PHASE 3A: Pass zoom/pan state to ViewPorts
          zoomLevel={zoomLevel}
          panOffset={panOffset}
          isActive={currentView === view.name}
          onViewActivate={() => setCurrentView(view.name)}
        />
      ))}
      
      {/* PHASE 3A: Debug overlay for zoom/pan state (only in debug mode) */}
      {getDebugInfo().isInitialized && (
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px',
          fontSize: '10px',
          borderRadius: '3px',
          pointerEvents: 'none',
          fontFamily: 'monospace'
        }}>
          Zoom: {zoomLevel.toFixed(2)}x | Pan: ({panOffset.x.toFixed(0)}, {panOffset.y.toFixed(0)})
          {currentView && <div>View: {currentView}</div>}
        </div>
      )}
    </div>
  );
};

export default ReactViewManager;
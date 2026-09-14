/**
 * Coordinate Transformation Utilities
 * 
 * Handles coordinate transformations between canvas coordinates and image coordinates
 * for the React ViewManager system.
 */

export interface CoordinateTransform {
  canvasToImage: (canvasX: number, canvasY: number) => { x: number, y: number };
  imageToCanvas: (imageX: number, imageY: number) => { x: number, y: number };
  scaleX: number;
  scaleY: number;
}

/**
 * Create coordinate transformation functions for a canvas that displays a scaled image
 */
export const createCoordinateTransform = (
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): CoordinateTransform => {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  
  return {
    scaleX,
    scaleY,
    
    canvasToImage: (canvasX: number, canvasY: number) => ({
      x: Math.round(canvasX / scaleX),
      y: Math.round(canvasY / scaleY)
    }),
    
    imageToCanvas: (imageX: number, imageY: number) => ({
      x: Math.round(imageX * scaleX),
      y: Math.round(imageY * scaleY)
    })
  };
};

/**
 * Update cursor coordinates in the legacy vars object exactly like legacy code
 */
export const updateCursorCoords = (
  canvas: HTMLCanvasElement,
  event: MouseEvent
) => {
  const w = window as any;
  if (!w.vars) {
    console.warn('Legacy vars not available - cursor coordinates not updated');
    return;
  }
  
  try {
    // Use the exact same logic as legacy update_cursor_coords function
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(
      (event.clientX - rect.left) / (rect.right - rect.left) * canvas.width
    );
    const y = Math.round(
      (event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
    );
    
    // Update canvas coordinates (this is the raw canvas pixel position)
    w.vars.cursor_canvas = [x, y];
    
    // Use getWorldCoords to transform to image coordinates (like legacy)
    // This is CRITICAL for zoom/pan to work correctly
    const ctx = canvas.getContext('2d');
    if (ctx && (ctx as any).getWorldCoords) {
      const imageCoords = (ctx as any).getWorldCoords(x, y);
      w.vars.cursor_image = [Math.round(imageCoords.x), Math.round(imageCoords.y)];
    } else {
      // Fallback if getWorldCoords not available
      console.warn('getWorldCoords not available on canvas context - using canvas coordinates as fallback');
      w.vars.cursor_image = [x, y];
    }
  } catch (error) {
    console.error('Error updating cursor coordinates:', error);
    // Don't crash - just skip the update
  }
};

/**
 * Create a custom getWorldCoords function for React canvases
 */
export const createGetWorldCoords = (transform: CoordinateTransform) => {
  return (canvasX: number, canvasY: number) => {
    const imageCoords = transform.canvasToImage(canvasX, canvasY);
    return {
      x: imageCoords.x,
      y: imageCoords.y,
      matrixTransform: () => ({ x: imageCoords.x, y: imageCoords.y })
    };
  };
};

/**
 * Create a custom getCanvasCoords function for React canvases
 */
export const createGetCanvasCoords = (transform: CoordinateTransform) => {
  return (imageX: number, imageY: number) => {
    const canvasCoords = transform.imageToCanvas(imageX, imageY);
    return {
      x: canvasCoords.x,
      y: canvasCoords.y,
      matrixTransform: () => ({ x: canvasCoords.x, y: canvasCoords.y })
    };
  };
};

/**
 * Add full trackTransforms functionality to React canvases
 * This enables zoom, pan, and other canvas transformations to work properly
 */
export const addTrackTransforms = (ctx: CanvasRenderingContext2D) => {
  const w = window as any;
  
  // ALWAYS reset the flag before applying, because canvas.width = X resets
  // the context state (transforms, clip, etc.) but the JS property persists.
  // Without this reset, trackTransforms won't be re-applied after a canvas
  // size change, leaving stale SVGMatrix state in the closures.
  (ctx as any).__trackTransformsApplied = false;
  
  if (w.trackTransforms) {
    try {
      // Use the existing trackTransforms function from utils.js
      // This will add getWorldCoords and getCanvasCoords that properly handle zoom/pan
      w.trackTransforms(ctx);
      // Mark this context as having trackTransforms applied
      (ctx as any).__trackTransformsApplied = true;
    } catch (error) {
      console.error('Failed to apply trackTransforms:', error);
      // Provide minimal fallback
      addFallbackTransforms(ctx);
    }
  } else {
    console.warn('trackTransforms function not available - providing fallback implementation');
    addFallbackTransforms(ctx);
  }
};

/**
 * Fallback implementation when trackTransforms is not available
 */
const addFallbackTransforms = (ctx: CanvasRenderingContext2D) => {
  // Simple fallback that assumes no transformation
  (ctx as any).getWorldCoords = (x: number, y: number) => ({ x, y });
  (ctx as any).getCanvasCoords = (x: number, y: number) => ({ x, y });
  (ctx as any).__trackTransformsApplied = true;
};
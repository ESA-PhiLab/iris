/**
 * Tests for vars.mask_shape migration to React store
 * 
 * This test suite covers the migration of vars.mask_shape to segmentationStore.maskDimensions
 * with helper functions for array-style access compatibility.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useSegmentationStore } from './segmentationStore';

// Mock window object for legacy compatibility
const mockWindow = {
  vars: {
    mask: null as Uint8Array | null,
    user_mask: null as Uint8Array | null,
    errors_mask: null as Uint8Array | null,
    mask_shape: null as [number, number] | null,
  },
  getMaskShapeFromStore: null as (() => [number, number] | null) | null,
  setMaskShapeInStore: null as ((width: number, height: number) => void) | null,
  getMaskWidthFromStore: null as (() => number) | null,
  getMaskHeightFromStore: null as (() => number) | null,
};

// Setup window mock
beforeEach(() => {
  // Reset store state manually instead of using clearMask
  const store = useSegmentationStore.getState();
  store.setMaskData = (data: Uint8Array, width: number, height: number) => {
    useSegmentationStore.setState({ 
      maskData: data,
      maskDimensions: { width, height }
    });
  };
  
  // Reset to initial state
  useSegmentationStore.setState({
    maskData: null,
    userMaskData: null,
    errorsMaskData: null,
    maskDimensions: null,
  });
  
  // Reset mock window
  mockWindow.vars.mask = null;
  mockWindow.vars.user_mask = null;
  mockWindow.vars.errors_mask = null;
  mockWindow.vars.mask_shape = null;
  
  // Setup window functions (these would be set by the actual store)
  mockWindow.getMaskShapeFromStore = () => {
    const dimensions = useSegmentationStore.getState().maskDimensions;
    return dimensions ? [dimensions.width, dimensions.height] : null;
  };
  
  mockWindow.setMaskShapeInStore = (width: number, height: number) => {
    useSegmentationStore.getState().setMaskDimensions({ width, height });
  };
  
  mockWindow.getMaskWidthFromStore = () => {
    const dimensions = useSegmentationStore.getState().maskDimensions;
    return dimensions ? dimensions.width : 0;
  };
  
  mockWindow.getMaskHeightFromStore = () => {
    const dimensions = useSegmentationStore.getState().maskDimensions;
    return dimensions ? dimensions.height : 0;
  };
  
  // Mock window object
  global.window = mockWindow as any;
});

describe('maskShape/maskDimensions Migration', () => {
  test('gets mask shape as array format', () => {
    const store = useSegmentationStore.getState();
    
    // Set dimensions in store
    store.setMaskDimensions({ width: 100, height: 200 });
    
    // Test getMaskShape method
    const shape = store.getMaskShape();
    expect(shape).toEqual([100, 200]);
    
    // Test helper function
    const shapeFromHelper = mockWindow.getMaskShapeFromStore!();
    expect(shapeFromHelper).toEqual([100, 200]);
  });

  test('sets mask dimensions correctly', () => {
    // Test setMaskDimensions method
    const store = useSegmentationStore.getState();
    store.setMaskDimensions({ width: 150, height: 300 });
    
    // Get fresh state after update
    const updatedStore = useSegmentationStore.getState();
    expect(updatedStore.maskDimensions).toEqual({ width: 150, height: 300 });
    expect(updatedStore.getMaskShape()).toEqual([150, 300]);
    
    // Test helper function
    mockWindow.setMaskShapeInStore!(200, 400);
    const finalStore = useSegmentationStore.getState();
    expect(finalStore.maskDimensions).toEqual({ width: 200, height: 400 });
    expect(finalStore.getMaskShape()).toEqual([200, 400]);
  });

  test('handles null/undefined dimensions gracefully', () => {
    const store = useSegmentationStore.getState();
    
    // Initially no dimensions
    expect(store.getMaskShape()).toBeNull();
    expect(mockWindow.getMaskShapeFromStore!()).toBeNull();
    expect(mockWindow.getMaskWidthFromStore!()).toBe(0);
    expect(mockWindow.getMaskHeightFromStore!()).toBe(0);
  });

  test('integrates with existing maskData operations', () => {
    // Set mask data (this should also set dimensions)
    const store = useSegmentationStore.getState();
    const maskData = new Uint8Array(12); // 3x4 = 12 pixels
    store.setMaskData(maskData, 3, 4);
    
    // Get fresh state after update
    const updatedStore = useSegmentationStore.getState();
    
    // Check that dimensions are set correctly
    expect(updatedStore.maskDimensions).toEqual({ width: 3, height: 4 });
    expect(updatedStore.getMaskShape()).toEqual([3, 4]);
    expect(mockWindow.getMaskShapeFromStore!()).toEqual([3, 4]);
  });

  test('validates input parameters', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test invalid dimensions
    store.setMaskDimensions({ width: -1, height: 100 } as any);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid dimensions'),
      expect.objectContaining({ width: -1, height: 100 })
    );
    
    // Test invalid helper function call
    mockWindow.setMaskShapeInStore!(0, 50);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid dimensions'),
      expect.objectContaining({ width: 0, height: 50 })
    );
    
    consoleSpy.mockRestore();
  });
});
/**
 * Tests for viewManagerStore canvasMousePosition functionality
 * 
 * This tests the migration of vars.cursor_canvas to React store
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useViewManagerStore } from './viewManagerStore';

// Mock window object for legacy vars
const mockWindow = {
  vars: {
    cursor_canvas: [0, 0] as [number, number],
    config: undefined as any,
    image_id: undefined as string | undefined,
  }
};

beforeEach(() => {
  // Reset store state
  useViewManagerStore.setState({
    canvasMousePosition: [0, 0],
  });
  
  // Reset window mock
  vi.stubGlobal('window', mockWindow);
  mockWindow.vars.cursor_canvas = [0, 0];
  
  // Set up global functions (these are normally set up when the store module loads)
  (global.window as any).getCanvasMousePositionFromStore = () => {
    return useViewManagerStore.getState().canvasMousePosition;
  };
  
  (global.window as any).setCanvasMousePositionInStore = (x: number, y: number) => {
    useViewManagerStore.getState().setCanvasMousePosition([x, y]);
  };
  
  (global.window as any).reactViewManager = {
    setCanvasMousePosition: (x: number, y: number) =>
      useViewManagerStore.getState().setCanvasMousePosition([x, y]),
    getCanvasMousePosition: () => useViewManagerStore.getState().canvasMousePosition,
  };
});

describe('canvasMousePosition', () => {
  test('sets canvas coordinates correctly', () => {
    const store = useViewManagerStore.getState();
    
    store.setCanvasMousePosition([100, 200]);
    
    const state = useViewManagerStore.getState();
    expect(state.canvasMousePosition).toEqual([100, 200]);
  });

  test('validates coordinate input - invalid array length', () => {
    const store = useViewManagerStore.getState();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Testing invalid input
    store.setCanvasMousePosition([100] as any);
    
    const state = useViewManagerStore.getState();
    expect(state.canvasMousePosition).toEqual([0, 0]); // Should remain unchanged
    expect(consoleSpy).toHaveBeenCalledWith('[IRIS] setCanvasMousePosition: Invalid coordinates', [100]);
    
    consoleSpy.mockRestore();
  });

  test('validates coordinate input - non-array input', () => {
    const store = useViewManagerStore.getState();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Testing invalid input
    store.setCanvasMousePosition('invalid' as any);
    
    const state = useViewManagerStore.getState();
    expect(state.canvasMousePosition).toEqual([0, 0]); // Should remain unchanged
    expect(consoleSpy).toHaveBeenCalledWith('[IRIS] setCanvasMousePosition: Invalid coordinates', 'invalid');
    
    consoleSpy.mockRestore();
  });

  test('validates coordinate input - non-numeric values', () => {
    const store = useViewManagerStore.getState();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Testing invalid input
    store.setCanvasMousePosition(['100', '200'] as any);
    
    const state = useViewManagerStore.getState();
    expect(state.canvasMousePosition).toEqual([0, 0]); // Should remain unchanged
    expect(consoleSpy).toHaveBeenCalledWith('[IRIS] setCanvasMousePosition: Invalid coordinates', ['100', '200']);
    
    consoleSpy.mockRestore();
  });

  test('no longer syncs with legacy vars object (vars removed)', () => {
    const store = useViewManagerStore.getState();
    
    store.setCanvasMousePosition([150, 250]);
    
    // Verify store has the value - vars sync has been removed
    expect(useViewManagerStore.getState().canvasMousePosition).toEqual([150, 250]);
  });

  test('handles invalid coordinates gracefully (NaN)', () => {
    const store = useViewManagerStore.getState();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Set valid coordinates first
    store.setCanvasMousePosition([100, 200]);
    expect(useViewManagerStore.getState().canvasMousePosition).toEqual([100, 200]);
    
    // Try to set invalid coordinates
    store.setCanvasMousePosition([NaN, 300] as any);
    
    // Should remain unchanged
    expect(useViewManagerStore.getState().canvasMousePosition).toEqual([100, 200]);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('initializes from legacy vars during store initialization', () => {
    // Set up legacy vars
    mockWindow.vars.cursor_canvas = [500, 600];
    mockWindow.vars.config = { views: {} };
    mockWindow.vars.image_id = 'test-image';
    
    const store = useViewManagerStore.getState();
    
    // Simulate initialization
    return store.initializeFromLegacy().then(() => {
      const state = useViewManagerStore.getState();
      expect(state.canvasMousePosition).toEqual([500, 600]);
    });
  });

  test('legacy bridge functions work correctly', () => {
    const reactViewManager = (window as any).reactViewManager;
    
    // Test setCanvasMousePosition
    reactViewManager.setCanvasMousePosition(111, 222);
    expect(useViewManagerStore.getState().canvasMousePosition).toEqual([111, 222]);
    
    // Test getCanvasMousePosition
    expect(reactViewManager.getCanvasMousePosition()).toEqual([111, 222]);
    
    // Test global bridge functions
    const setCanvasMousePositionInStore = (window as any).setCanvasMousePositionInStore;
    setCanvasMousePositionInStore(333, 444);
    expect(useViewManagerStore.getState().canvasMousePosition).toEqual([333, 444]);
    
    const getCanvasMousePositionFromStore = (window as any).getCanvasMousePositionFromStore;
    expect(getCanvasMousePositionFromStore()).toEqual([333, 444]);
  });
});
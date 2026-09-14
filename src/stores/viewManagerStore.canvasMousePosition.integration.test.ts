/**
 * Integration tests for canvas mouse position coordinate transformation
 * 
 * Tests the relationship between canvas coordinates and image coordinates
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useViewManagerStore } from './viewManagerStore';
import { useSegmentationStore } from './segmentationStore';

// Mock canvas context with getWorldCoords
const mockCanvas = {
  getContext: vi.fn(() => ({
    getWorldCoords: vi.fn((x: number, y: number) => ({ x: x * 2, y: y * 2 })), // Simple 2x transformation
  })),
  width: 400,
  height: 400,
};

// Mock DOM
const mockWindow = {
  vars: {
    cursor_canvas: [0, 0] as [number, number],
    cursor_image: [0, 0] as [number, number],
  },
  setCursorImageInStore: vi.fn() as any,
  setCanvasMousePositionInStore: vi.fn() as any,
  getCanvasMousePositionFromStore: vi.fn() as any,
};

beforeEach(() => {
  // Reset stores
  useViewManagerStore.setState({
    canvasMousePosition: [0, 0],
  });
  
  useSegmentationStore.setState({
    cursorImage: [0, 0],
  });
  
  // Mock DOM elements
  vi.stubGlobal('document', {
    getElementsByClassName: vi.fn(() => [mockCanvas]),
  });
  
  vi.stubGlobal('window', mockWindow);
  
  // Set up bridge functions
  mockWindow.setCursorImageInStore = vi.fn((x: number, y: number) => {
    useSegmentationStore.getState().setCursorImage([x, y]);
  }) as any;
  
  mockWindow.setCanvasMousePositionInStore = vi.fn((x: number, y: number) => {
    useViewManagerStore.getState().setCanvasMousePosition([x, y]);
  }) as any;
  
  mockWindow.getCanvasMousePositionFromStore = vi.fn(() => {
    return useViewManagerStore.getState().canvasMousePosition;
  }) as any;
  
  // Reset mocks
  vi.clearAllMocks();
});

describe('canvas mouse position integration', () => {
  test('coordinate transformation between canvas and image systems', () => {
    const viewStore = useViewManagerStore.getState();
    
    // Set canvas coordinates
    viewStore.setCanvasMousePosition([100, 150]);
    
    // Verify canvas coordinates are set
    expect(useViewManagerStore.getState().canvasMousePosition).toEqual([100, 150]);
    
    // Simulate the coordinate transformation that happens in update_cursor_coords
    const canvasCoords = useViewManagerStore.getState().canvasMousePosition;
    const mockCtx = mockCanvas.getContext();
    const imageCoords = mockCtx.getWorldCoords(canvasCoords[0], canvasCoords[1]);
    
    // Update image coordinates through the bridge function
    mockWindow.setCursorImageInStore(imageCoords.x, imageCoords.y);
    
    // Verify image coordinates were transformed correctly
    expect(useSegmentationStore.getState().cursorImage).toEqual([200, 300]); // 2x transformation
  });

  test('legacy bridge functions work correctly in integration context', () => {
    // Test setting through legacy bridge
    mockWindow.setCanvasMousePositionInStore(300, 400);
    expect(useViewManagerStore.getState().canvasMousePosition).toEqual([300, 400]);
    
    // Test getting through legacy bridge
    const coords = mockWindow.getCanvasMousePositionFromStore();
    expect(coords).toEqual([300, 400]);
  });
});
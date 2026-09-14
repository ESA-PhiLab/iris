import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSegmentationStore } from './segmentationStore';

// Mock window object
const mockViewManager = {
  filters: { brightness: 100, saturation: 100, contrast: false, invert: false },
  render: vi.fn(),
  getLayers: vi.fn(() => []),
};

const mockWindow = {
  vars: {
    tool: { size: 5, type: 'draw', resizing_mode: false },
    cursor_image: [0, 0],
    drag_start: null,
  },
  render_preview: vi.fn(),
  getViewManagerFromStore: vi.fn(() => mockViewManager),
};

Object.defineProperty(window, 'vars', { value: mockWindow.vars, writable: true });
Object.defineProperty(window, 'render_preview', { value: mockWindow.render_preview, writable: true });
Object.defineProperty(window, 'getViewManagerFromStore', { value: mockWindow.getViewManagerFromStore, writable: true });

describe('segmentationStore - Navigation Dialog Bug Fix', () => {
  beforeEach(() => {
    useSegmentationStore.getState().setMaskChanged(false);
    useSegmentationStore.getState().setShowDialogueBeforeNextImage(false);
  });

  it('resets showDialogueBeforeNextImage when mask is saved', () => {
    // User makes changes to mask
    useSegmentationStore.getState().setMaskChanged(true);
    expect(useSegmentationStore.getState().showDialogueBeforeNextImage).toBe(true);
    
    // User saves mask
    useSegmentationStore.getState().setMaskChanged(false);
    expect(useSegmentationStore.getState().showDialogueBeforeNextImage).toBe(false);
  });
});

describe('segmentationStore - Filter Functions', () => {
  beforeEach(() => {
    useSegmentationStore.getState().resetFilters();
    vi.clearAllMocks();
  });

  it('manages filter values with clamping and legacy sync', () => {
    const store = useSegmentationStore.getState();
    
    store.setBrightness(150);
    expect(useSegmentationStore.getState().brightness).toBe(150);
    expect(mockViewManager.filters.brightness).toBe(150);
    
    store.setBrightness(1000); // Should clamp to 800
    expect(useSegmentationStore.getState().brightness).toBe(800);
    
    store.changeBrightness(false); // Should decrease by 10
    expect(useSegmentationStore.getState().brightness).toBe(790);
  });

  it('handles slider expansion', () => {
    const store = useSegmentationStore.getState();
    
    store.setExpandedFilterSlider('brightness');
    expect(useSegmentationStore.getState().expandedFilterSlider).toBe('brightness');
    
    store.setExpandedFilterSlider('saturation');
    expect(useSegmentationStore.getState().expandedFilterSlider).toBe('saturation');
  });
});

describe('segmentationStore - Tool Size Migration', () => {
  beforeEach(() => {
    useSegmentationStore.getState().setToolSize(5);
    vi.clearAllMocks();
  });

  it('manages tool size with bounds', () => {
    const store = useSegmentationStore.getState();
    
    store.setToolSize(10);
    expect(useSegmentationStore.getState().toolSize).toBe(10);
    
    store.setToolSize(0); // Should clamp to 1
    expect(useSegmentationStore.getState().toolSize).toBe(1);
    
    store.setToolSize(150); // Should clamp to 100
    expect(useSegmentationStore.getState().toolSize).toBe(100);
  });
});

describe('segmentationStore - Tool Resizing Mode Migration', () => {
  it('manages tool resizing mode', () => {
    const store = useSegmentationStore.getState();
    
    store.setToolResizingMode(true);
    expect(useSegmentationStore.getState().toolResizingMode).toBe(true);
    
    store.setToolResizingMode(false);
    expect(useSegmentationStore.getState().toolResizingMode).toBe(false);
  });
});

describe('segmentationStore - Cursor Image Migration', () => {
  it('manages cursor coordinates', () => {
    const store = useSegmentationStore.getState();
    
    store.setCursorImage([100, 200]);
    expect(useSegmentationStore.getState().cursorImage).toEqual([100, 200]);
  });

  it('validates coordinate input', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    useSegmentationStore.getState().setCursorImage([100] as any);
    expect(consoleSpy).toHaveBeenCalledWith('[IRIS] setCursorImage: Invalid coordinates provided', [100]);
    
    consoleSpy.mockRestore();
  });
});

describe('segmentationStore - Tool Type Migration', () => {
  it('manages tool type', () => {
    const store = useSegmentationStore.getState();
    
    store.setCurrentTool('move');
    expect(useSegmentationStore.getState().currentTool).toBe('move');
  });

  it('validates tool type input', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    useSegmentationStore.getState().setCurrentTool('invalid' as any);
    expect(consoleSpy).toHaveBeenCalledWith('[IRIS] setCurrentTool: Invalid tool type provided', 'invalid');
    
    consoleSpy.mockRestore();
  });
});

describe('segmentationStore - Drag Start Migration', () => {
  it('manages drag coordinates', () => {
    const store = useSegmentationStore.getState();
    
    store.setDragStart([100, 200]);
    expect(useSegmentationStore.getState().dragStart).toEqual([100, 200]);
    
    store.setDragStart(null);
    expect(useSegmentationStore.getState().dragStart).toBe(null);
  });

  it('validates coordinate input', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    useSegmentationStore.getState().setDragStart([100] as any);
    expect(consoleSpy).toHaveBeenCalledWith('[IRIS] setDragStart: Invalid coordinates provided', [100]);
    
    consoleSpy.mockRestore();
  });
});
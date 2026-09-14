import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ReactViewManager from './ReactViewManager';

// Mock the store
const mockStore = {
  currentGroup: 0,
  viewWidth: 400,
  viewHeight: 300,
  showControls: true,
  imageId: 'test-image',
  imageLocation: [0, 0] as [number, number],
  // PHASE 3A: Add missing zoom/pan/canvas state
  currentView: null,
  zoomLevel: 1.0,
  panOffset: { x: 0, y: 0 },
  canvasDimensions: { width: 400, height: 300 },
  mousePosition: { x: 0, y: 0 },
  isMouseDown: false,
  isDragging: false,
  // Actions
  getCurrentViews: () => [],
  updateViewDimensions: () => {},
  setImageLocation: () => {},
  // PHASE 3A: Add missing actions
  setCurrentView: () => {},
  updateCanvasDimensions: () => {},
  updateMousePosition: () => {},
  setMouseDown: () => {},
  setDragging: () => {},
  screenToImageCoordinates: () => ({ x: 0, y: 0 }),
  imageToScreenCoordinates: () => ({ x: 0, y: 0 }),
  getDebugInfo: () => ({
    hasViews: false,
    viewsCount: 0,
    currentGroup: 'default',
    imageId: 'test-image',
    imageLocation: [0, 0],
    filters: { contrast: false, invert: false, brightness: 100, saturation: 100 },
    isInitialized: false,
    initializationError: null,
    // PHASE 3A: Add missing debug info
    currentView: null,
    zoomLevel: 1.0,
    panOffset: { x: 0, y: 0 },
    canvasDimensions: { width: 400, height: 300 },
    mousePosition: { x: 0, y: 0 },
    isMouseDown: false,
    isDragging: false,
  }),
};

vi.mock('../../stores/viewManagerStore', () => ({
  useViewManagerStore: () => mockStore,
}));

describe('ReactViewManager', () => {
  beforeEach(() => {
    // Mock window.vars
    (window as any).vars = {
      config: { views: {} },
      image_shape: [100, 100],
    };
  });

  it('renders no views message when no views configured', () => {
    render(<ReactViewManager />);
    expect(screen.getByText('No views configured or image not loaded')).toBeInTheDocument();
  });

  it('renders with basic props', () => {
    const { container } = render(<ReactViewManager className="test-class" />);
    expect(container.firstChild).toHaveClass('react-view-manager test-class');
  });
});
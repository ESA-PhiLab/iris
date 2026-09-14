import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DebugPanel from './DebugPanel';

// Mock the store
const mockStore = {
  currentGroup: 0,
  views: [],
  getCurrentViews: () => [],
  getDebugInfo: () => ({
    hasViews: false,
    viewsCount: 0,
    currentGroup: 'default',
    imageId: null,
    imageLocation: [0, 0],
    filters: { contrast: false, invert: false, brightness: 100, saturation: 100 },
    isInitialized: false,
    initializationError: null,
  }),
  retryInitialization: () => {},
};

const mockSegmentationStore = {
  getDebugInfo: () => ({
    showMask: true,
    currentImageId: null,
    imagesCount: 0,
    filtersActive: false,
    brightness: 100,
    saturation: 100,
    contrast: false,
    invert: false,
  }),
};

vi.mock('../../stores/viewManagerStore', () => ({
  useViewManagerStore: () => mockStore,
}));

vi.mock('../../stores/segmentationStore', () => ({
  useSegmentationStore: () => mockSegmentationStore,
}));

describe('DebugPanel', () => {
  beforeEach(() => {
    // Mock window.vars
    (window as any).vars = {
      config: { views: {} },
      image_shape: [100, 100],
    };
  });

  it('renders debug panel title', () => {
    render(<DebugPanel />);
    expect(screen.getByText('🐛 Debug')).toBeInTheDocument();
  });

  it('shows debug button', () => {
    render(<DebugPanel />);
    expect(screen.getByText('🐛 Debug')).toBeInTheDocument();
  });
});
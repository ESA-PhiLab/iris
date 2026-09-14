import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '../../../test/test-utils';
import FilterTools from './FilterTools';
import { useSegmentationStore } from '../../../stores/segmentationStore';

// Mock the segmentation store
vi.mock('../../../stores/segmentationStore', () => ({
  useSegmentationStore: vi.fn(),
}));

describe('FilterTools', () => {
  const mockStore = {
    brightness: 100,
    saturation: 100,
    contrast: false,
    invert: false,
    setBrightness: vi.fn(),
    setSaturation: vi.fn(),
    setContrast: vi.fn(),
    setInvert: vi.fn(),
    resetFilters: vi.fn(),
    changeBrightness: vi.fn(),
    changeSaturation: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useSegmentationStore).mockReturnValue(mockStore);
  });

  it('renders filter controls', () => {
    const { container } = render(<FilterTools />);
    
    // Check for slider toggle buttons
    expect(container.querySelector('#tb_brightness_toggle')).toBeInTheDocument();
    expect(container.querySelector('#tb_saturation_toggle')).toBeInTheDocument();
    
    // Check for toggle buttons
    expect(container.querySelector('#tb_toggle_contrast')).toBeInTheDocument();
    expect(container.querySelector('#tb_toggle_invert')).toBeInTheDocument();
    expect(container.querySelector('#tb_reset_filters')).toBeInTheDocument();
  });

  it('calls setContrast when contrast button is clicked', () => {
    const { container } = render(<FilterTools />);
    
    const contrastButton = container.querySelector('#tb_toggle_contrast');
    fireEvent.click(contrastButton!);
    
    expect(mockStore.setContrast).toHaveBeenCalledWith(true);
  });

  it('calls setInvert when invert button is clicked', () => {
    const { container } = render(<FilterTools />);
    
    const invertButton = container.querySelector('#tb_toggle_invert');
    fireEvent.click(invertButton!);
    
    expect(mockStore.setInvert).toHaveBeenCalledWith(true);
  });

  it('calls resetFilters when reset button is clicked', () => {
    const { container } = render(<FilterTools />);
    
    const resetButton = container.querySelector('#tb_reset_filters');
    fireEvent.click(resetButton!);
    
    expect(mockStore.resetFilters).toHaveBeenCalled();
  });

  it('shows checked state for active filters', () => {
    const activeStore = { ...mockStore, contrast: true, invert: true };
    vi.mocked(useSegmentationStore).mockReturnValue(activeStore);
    
    const { container } = render(<FilterTools />);
    
    const contrastButton = container.querySelector('#tb_toggle_contrast');
    const invertButton = container.querySelector('#tb_toggle_invert');
    
    expect(contrastButton).toHaveClass('checked');
    expect(invertButton).toHaveClass('checked');
  });
});

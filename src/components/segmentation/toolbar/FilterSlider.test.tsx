import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '../../../test/test-utils';
import FilterSlider from './FilterSlider';
import { useSegmentationStore } from '../../../stores/segmentationStore';

// Mock the segmentation store
vi.mock('../../../stores/segmentationStore', () => ({
  useSegmentationStore: vi.fn(),
}));

describe('FilterSlider', () => {
  const defaultProps = {
    id: 'test-slider',
    label: 'Test Filter',
    value: 100,
    min: 0,
    max: 200,
    step: 10,
    icon: '/test-icon.png',
    onChange: vi.fn(),
    onIncrease: vi.fn(),
    onDecrease: vi.fn(),
  };

  const mockStore = {
    expandedFilterSlider: null,
    setExpandedFilterSlider: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useSegmentationStore).mockReturnValue(mockStore);
    vi.clearAllMocks();
  });

  it('toggles expansion and calls slider controls', () => {
    const onChange = vi.fn();
    
    // Test expansion
    const { rerender } = render(<FilterSlider {...defaultProps} onChange={onChange} />);
    
    const toggleButton = screen.getByRole('listitem');
    fireEvent.click(toggleButton);
    expect(mockStore.setExpandedFilterSlider).toHaveBeenCalledWith('test-slider');
    
    // Test expanded state with controls
    const expandedStore = { ...mockStore, expandedFilterSlider: 'test-slider' };
    vi.mocked(useSegmentationStore).mockReturnValue(expandedStore);
    
    rerender(<FilterSlider {...defaultProps} onChange={onChange} />);
    
    // Test slider interaction
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '150' } });
    expect(onChange).toHaveBeenCalledWith(150);
    
    // Test +/- buttons
    fireEvent.click(screen.getByText('+'));
    expect(defaultProps.onIncrease).toHaveBeenCalled();
  });

  it('implements exclusive expansion behavior', () => {
    // Test that only one slider can be expanded
    const expandedStore = { ...mockStore, expandedFilterSlider: 'other-slider' };
    vi.mocked(useSegmentationStore).mockReturnValue(expandedStore);
    
    render(<FilterSlider {...defaultProps} />);
    
    // Should not show panel when another slider is expanded
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});
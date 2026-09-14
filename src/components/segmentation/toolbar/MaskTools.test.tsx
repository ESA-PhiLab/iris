import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act } from '../../../test/test-utils';
import MaskTools from './MaskTools';
import { useSegmentationStore } from '../../../stores/segmentationStore';

describe('MaskTools', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSegmentationStore.setState({ showMask: true });
  });

  it('renders toggle mask button', () => {
    render(<MaskTools />);
    const button = document.getElementById('tb_toggle_mask');
    expect(button).toBeInTheDocument();
  });

  it('shows checked state when mask is visible', () => {
    useSegmentationStore.setState({ showMask: true });
    render(<MaskTools />);
    const button = document.getElementById('tb_toggle_mask');
    expect(button).toHaveClass('checked');
  });

  it('does not show checked state when mask is hidden', () => {
    useSegmentationStore.setState({ showMask: false });
    render(<MaskTools />);
    const button = document.getElementById('tb_toggle_mask');
    expect(button).not.toHaveClass('checked');
  });

  it('toggles mask visibility when clicked', () => {
    render(<MaskTools />);
    
    // Initial state: mask visible
    expect(useSegmentationStore.getState().showMask).toBe(true);
    
    // Click to hide
    const button = document.getElementById('tb_toggle_mask')!;
    act(() => {
      fireEvent.click(button);
    });
    expect(useSegmentationStore.getState().showMask).toBe(false);
    
    // Click to show again
    act(() => {
      fireEvent.click(button);
    });
    expect(useSegmentationStore.getState().showMask).toBe(true);
  });

  it('updates checked class when store changes', () => {
    const { rerender } = render(<MaskTools />);
    const button = document.getElementById('tb_toggle_mask');
    
    // Initially checked
    expect(button).toHaveClass('checked');
    
    // Change store state
    act(() => {
      useSegmentationStore.getState().setShowMask(false);
    });
    rerender(<MaskTools />);
    expect(button).not.toHaveClass('checked');
    
    // Change back
    act(() => {
      useSegmentationStore.getState().setShowMask(true);
    });
    rerender(<MaskTools />);
    expect(button).toHaveClass('checked');
  });
});

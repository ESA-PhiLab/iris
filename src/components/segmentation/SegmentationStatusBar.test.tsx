import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import SegmentationStatusBar from './SegmentationStatusBar';

describe('SegmentationStatusBar', () => {
  const mockProps = {
    onOpenProfile: vi.fn(),
    onOpenImageInfo: vi.fn(),
    onOpenConfusionMatrix: vi.fn(),
  };

  it('renders status bar with all sections', () => {
    const { container } = render(<SegmentationStatusBar {...mockProps} />);
    
    const statusbar = container.querySelector('#statusbar');
    expect(statusbar).toBeInTheDocument();
    expect(statusbar).toHaveClass('statusbar');
  });

  it('renders all status bar components', () => {
    const { container } = render(<SegmentationStatusBar {...mockProps} />);
    
    expect(container.querySelector('#user-info')).toBeInTheDocument();
    expect(container.querySelector('#admin-button')).toBeInTheDocument();
    expect(container.querySelector('#image-info')).toBeInTheDocument();
    expect(container.querySelector('#different-classes')).toBeInTheDocument();
    expect(container.querySelector('#drawn-pixels')).toBeInTheDocument();
    expect(screen.getByText('AI Score')).toBeInTheDocument();
    expect(container.querySelector('#ai-recommendation')).toBeInTheDocument();
  });
});

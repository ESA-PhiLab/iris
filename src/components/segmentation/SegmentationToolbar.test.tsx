import { describe, it, expect, vi } from 'vitest';
import { render } from '../../test/test-utils';
import SegmentationToolbar from './SegmentationToolbar';

describe('SegmentationToolbar', () => {
  const mockProps = {
    onExportGeoTIFF: vi.fn(),
    onSelectClass: vi.fn(),
    onResetMask: vi.fn(),
    onOpenHelp: vi.fn(),
    onOpenPreferences: vi.fn(),
  };

  it('renders toolbar with all sections', () => {
    const { container } = render(<SegmentationToolbar {...mockProps} />);
    
    const toolbar = container.querySelector('#toolbar');
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveClass('toolbar');
  });

  it('renders toolbar separators', () => {
    const { container } = render(<SegmentationToolbar {...mockProps} />);
    
    const separators = container.querySelectorAll('.toolbar_separator');
    expect(separators.length).toBeGreaterThan(0);
  });
});

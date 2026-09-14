import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '../../../test/test-utils';
import NavigationTools from './NavigationTools';

describe('NavigationTools', () => {
  it('renders navigation buttons', () => {
    const { container } = render(<NavigationTools onExportGeoTIFF={vi.fn()} />);
    
    expect(container.querySelector('#tb_previous_image')).toBeInTheDocument();
    expect(container.querySelector('#tb_next_image')).toBeInTheDocument();
    expect(container.querySelector('#tb_save_mask')).toBeInTheDocument();
  });

  it('calls onExportGeoTIFF when export button is clicked', () => {
    const handleExport = vi.fn();
    const { container } = render(<NavigationTools onExportGeoTIFF={handleExport} />);
    
    const exportButton = container.querySelector('#tb_export_geotiff');
    expect(exportButton).toBeInTheDocument();
    
    if (exportButton) {
      fireEvent.click(exportButton);
      expect(handleExport).toHaveBeenCalledTimes(1);
    }
  });
});

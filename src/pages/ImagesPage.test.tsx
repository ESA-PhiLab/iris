import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImagesPage from './ImagesPage';

const exportMergedImages = vi.fn();
const downloadFile = vi.fn();
vi.mock('../export/annotated', () => ({
  exportMergedImages: (...args: unknown[]) => exportMergedImages(...args),
  downloadFile: (...args: unknown[]) => downloadFile(...args),
}));

describe('ImagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<ImagesPage />);
    expect(screen.getByText('Loading images...')).toBeInTheDocument();
  });

  it('fetches and displays images', async () => {
    const mockImages = {
      images: [
        {
          image_id: 'test_001',
          types: {
            segmentation: {
              count: 3,
              score: 85.5,
              difficulty: 2.5,
              time_spent: 1.5
            }
          }
        }
      ],
      order_by: 'image_id',
      ascending: true
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockImages
    });

    render(<ImagesPage />);

    await waitFor(() => {
      expect(screen.getByText('test_001')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('85.50')).toBeInTheDocument();
  });

  it('displays export all button', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [], order_by: 'image_id', ascending: true })
    });

    render(<ImagesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Export All GeoTIFFs/i)).toBeInTheDocument();
    });
  });

  const mockImageList = () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        images: [
          { image_id: 'a', types: { segmentation: { count: 1, score: 1, difficulty: 1, time_spent: 1 } } },
          { image_id: 'b', types: {} },
        ],
        order_by: 'image_id',
        ascending: true,
      }),
    });
  };

  it('exports all images in the browser and downloads them', async () => {
    mockImageList();
    exportMergedImages.mockResolvedValue({ bytes: new Uint8Array(3), name: 'demo_merged_masks.zip', count: 1 });
    render(<ImagesPage />);
    await waitFor(() => screen.getByText(/Export All GeoTIFFs/i));

    fireEvent.click(screen.getByText(/Export All GeoTIFFs/i));

    await waitFor(() => expect(screen.getByText(/Exported 1 images/)).toBeInTheDocument());
    expect(exportMergedImages.mock.calls[0][0]).toEqual(['a', 'b']);
    expect(downloadFile).toHaveBeenCalledWith(new Uint8Array(3), 'demo_merged_masks.zip', 'application/zip');
    expect(screen.getByText(/Skipped 1 images/)).toBeInTheDocument();
  });

  it('says when no image has annotations', async () => {
    mockImageList();
    exportMergedImages.mockResolvedValue(null);
    render(<ImagesPage />);
    await waitFor(() => screen.getByText(/Export All GeoTIFFs/i));

    fireEvent.click(screen.getByText(/Export All GeoTIFFs/i));

    await waitFor(() => expect(screen.getByText(/No image has annotations/)).toBeInTheDocument());
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('shows why an export failed', async () => {
    mockImageList();
    exportMergedImages.mockRejectedValue(new Error('disk full'));
    render(<ImagesPage />);
    await waitFor(() => screen.getByText(/Export All GeoTIFFs/i));

    fireEvent.click(screen.getByText(/Export All GeoTIFFs/i));

    await waitFor(() => expect(screen.getByText(/Export failed: disk full/)).toBeInTheDocument());
  });

  it('exports one image from its row', async () => {
    mockImageList();
    exportMergedImages.mockResolvedValue({ bytes: new Uint8Array(1), name: 'a_merged.tif', count: 1 });
    render(<ImagesPage />);
    await waitFor(() => screen.getByText('GeoTIFF'));

    fireEvent.click(screen.getByText('GeoTIFF'));

    await waitFor(() => expect(downloadFile).toHaveBeenCalledWith(new Uint8Array(1), 'a_merged.tif', 'image/tiff'));
    expect(exportMergedImages.mock.calls[0][0]).toEqual(['a']);
  });
});

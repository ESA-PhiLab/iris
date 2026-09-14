import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImagesPage from './ImagesPage';

// Mock window.goto_image
const mockGotoImage = vi.fn();
(window as any).goto_image = mockGotoImage;

// Mock window.prompt
const mockPrompt = vi.fn();
window.prompt = mockPrompt;

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

  it('handles export all button click', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [], order_by: 'image_id', ascending: true })
    });

    render(<ImagesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Export All GeoTIFFs/i)).toBeInTheDocument();
    });

    // Mock prompt to return a directory
    mockPrompt.mockReturnValueOnce('test_exports');

    // Mock export API call
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        exported_count: 5,
        skipped_count: 2,
        total_images: 7,
        output_dir: '/path/to/test_exports',
        files: ['file1.tif', 'file2.tif'],
        skipped: []
      })
    });

    const exportButton = screen.getByText(/Export All GeoTIFFs/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/Export complete/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Exported 5 images/i)).toBeInTheDocument();
  });

  it('handles export cancellation', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [], order_by: 'image_id', ascending: true })
    });

    render(<ImagesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Export All GeoTIFFs/i)).toBeInTheDocument();
    });

    // Mock prompt to return null (cancelled)
    mockPrompt.mockReturnValueOnce(null);

    const exportButton = screen.getByText(/Export All GeoTIFFs/i);
    fireEvent.click(exportButton);

    // Should not make export API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });
  });

  it('handles export error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [], order_by: 'image_id', ascending: true })
    });

    render(<ImagesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Export All GeoTIFFs/i)).toBeInTheDocument();
    });

    mockPrompt.mockReturnValueOnce('test_exports');

    // Mock export API call to fail
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Export failed',
        message: 'Disk full'
      })
    });

    const exportButton = screen.getByText(/Export All GeoTIFFs/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/Export failed/i)).toBeInTheDocument();
    });
  });

  it('disables export button during export', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [], order_by: 'image_id', ascending: true })
    });

    render(<ImagesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Export All GeoTIFFs/i)).toBeInTheDocument();
    });

    mockPrompt.mockReturnValueOnce('test_exports');

    // Mock export API call with delay
    (global.fetch as any).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          success: true,
          exported_count: 1,
          skipped_count: 0,
          total_images: 1,
          output_dir: '/test',
          files: [],
          skipped: []
        })
      }), 100))
    );

    const exportButton = screen.getByText(/Export All GeoTIFFs/i) as HTMLButtonElement;
    fireEvent.click(exportButton);

    // Button should show exporting state
    await waitFor(() => {
      expect(screen.getByText(/Exporting\.\.\./i)).toBeInTheDocument();
    });

    // Button should be disabled
    const exportingButton = screen.getByText(/Exporting\.\.\./i) as HTMLButtonElement;
    expect(exportingButton.disabled).toBe(true);
  });
});

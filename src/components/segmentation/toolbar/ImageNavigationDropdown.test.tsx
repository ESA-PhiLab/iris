/**
 * Tests for ImageNavigationDropdown component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/test-utils';
import { ImageNavigationDropdown } from './ImageNavigationDropdown';
import { useSegmentationStore } from '../../../stores/segmentationStore';

describe('ImageNavigationDropdown', () => {
  const mockImages = [
    {
      image_id: 'image_001',
      has_user_annotation: true,
      has_any_annotation: true,
      annotation_count: 1
    },
    {
      image_id: 'image_002',
      has_user_annotation: false,
      has_any_annotation: true,
      annotation_count: 2
    },
    {
      image_id: 'image_003',
      has_user_annotation: false,
      has_any_annotation: false,
      annotation_count: 0
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up store with test data
    useSegmentationStore.setState({
      images: mockImages,
      currentImageId: 'image_001',
      currentImageIndex: 0
    });
  });

  it('should render current image name', () => {
    const onNavigate = vi.fn();
    render(
      <ImageNavigationDropdown
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText('image_001')).toBeInTheDocument();
  });

  it('should use images from store', () => {
    const onNavigate = vi.fn();
    render(
      <ImageNavigationDropdown
        onNavigate={onNavigate}
      />
    );

    // Images should be available from store, not fetched
    expect(screen.getByText('image_001')).toBeInTheDocument();
  });

  it('should open dropdown when button is clicked', async () => {
    const onNavigate = vi.fn();
    render(
      <ImageNavigationDropdown
        onNavigate={onNavigate}
      />
    );

    const dropdown = screen.getByText('image_001').closest('div');
    fireEvent.click(dropdown!);

    await waitFor(() => {
      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('should display all images in dropdown', async () => {
    const onNavigate = vi.fn();
    render(
      <ImageNavigationDropdown
        onNavigate={onNavigate}
      />
    );

    const dropdown = screen.getByText('image_001').closest('div');
    fireEvent.click(dropdown!);

    await waitFor(() => {
      expect(screen.getAllByText('image_001').length).toBeGreaterThan(0);
      expect(screen.getByText('image_002')).toBeInTheDocument();
      expect(screen.getByText('image_003')).toBeInTheDocument();
    });
  });

  it('should call onNavigate when image is selected', async () => {
    const onNavigate = vi.fn();
    render(
      <ImageNavigationDropdown
        onNavigate={onNavigate}
      />
    );

    const dropdown = screen.getByText('image_001').closest('div');
    fireEvent.click(dropdown!);

    await waitFor(() => {
      const image002 = screen.getAllByText('image_002')[0];
      fireEvent.click(image002.closest('.image-dropdown-item')!);
    });

    expect(onNavigate).toHaveBeenCalledWith('image_002');
  });

  it('should close dropdown after selecting image', async () => {
    const onNavigate = vi.fn();
    render(
      <ImageNavigationDropdown
        onNavigate={onNavigate}
      />
    );

    const dropdown = screen.getByText('image_001').closest('div');
    fireEvent.click(dropdown!);

    await waitFor(() => {
      const image002 = screen.getAllByText('image_002')[0];
      fireEvent.click(image002.closest('.image-dropdown-item')!);
    });

    // Dropdown should be closed (header not visible)
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('should show empty state when no images in store', () => {
    useSegmentationStore.setState({
      images: [],
      currentImageId: null,
      currentImageIndex: -1
    });

    const onNavigate = vi.fn();
    render(
      <ImageNavigationDropdown
        onNavigate={onNavigate}
      />
    );

    const dropdown = screen.getByTitle('Select image to navigate');
    fireEvent.click(dropdown);

    expect(screen.getByText('No images loaded')).toBeInTheDocument();
  });
});

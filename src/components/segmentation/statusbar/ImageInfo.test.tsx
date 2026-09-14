import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageInfo from './ImageInfo';

describe('ImageInfo', () => {
  it('renders image info with loading text', () => {
    const { container } = render(<ImageInfo onOpenImageInfo={vi.fn()} />);
    
    const imageInfo = container.querySelector('#image-info');
    expect(imageInfo).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('calls onOpenImageInfo when clicked', () => {
    const handleOpenImageInfo = vi.fn();
    const { container } = render(<ImageInfo onOpenImageInfo={handleOpenImageInfo} />);
    
    const imageInfo = container.querySelector('#image-info');
    if (imageInfo) {
      fireEvent.click(imageInfo);
      expect(handleOpenImageInfo).toHaveBeenCalledTimes(1);
    }
  });
});

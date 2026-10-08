import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '../../../test/test-utils';
import React from 'react';
import GeneralSection from './GeneralSection';

describe('GeneralSection', () => {
  describe('getData()', () => {
    it('returns correct structure with default values', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        name: '',
        images: {
          path: 'images/{id}.tif',
          thumbnails: false,
          metadata: false,
        },
      });
    });

    it('returns updated values after user input', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      const nameInput = screen.getByPlaceholderText('cloud-segmentation');
      fireEvent.change(nameInput, { target: { value: 'my-project' } });
      
      const data = ref.current?.getData();
      expect(data.name).toBe('my-project');
    });

    it('returns thumbnails path when enabled', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      const thumbnailCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(thumbnailCheckbox);
      
      const thumbnailInput = screen.getByPlaceholderText('thumbnails/{id}.png');
      fireEvent.change(thumbnailInput, { target: { value: 'thumbs/{id}.jpg' } });
      
      const data = ref.current?.getData();
      expect(data.images.thumbnails).toBe('thumbs/{id}.jpg');
    });

    it('returns metadata path when enabled', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      const metadataCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(metadataCheckbox);
      
      const metadataInput = screen.getByPlaceholderText('metadata/{id}.json');
      fireEvent.change(metadataInput, { target: { value: 'meta/{id}.yaml' } });
      
      const data = ref.current?.getData();
      expect(data.images.metadata).toBe('meta/{id}.yaml');
    });
  });

  describe('setData()', () => {
    it('populates all fields correctly', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          name: 'test-project',
          images: {
            path: 'data/{id}.tif',
            thumbnails: 'thumbs/{id}.png',
            metadata: 'meta/{id}.json',
          },
        });
      });
      
      expect(screen.getByDisplayValue('test-project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('thumbs/{id}.png')).toBeInTheDocument();
      expect(screen.getByDisplayValue('meta/{id}.json')).toBeInTheDocument();
    });

    it('enables thumbnails checkbox when path provided', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          name: 'test',
          images: {
            path: 'data/{id}.tif',
            thumbnails: 'thumbs/{id}.png',
          },
        });
      });
      
      const thumbnailCheckbox = screen.getAllByRole('checkbox')[0];
      expect(thumbnailCheckbox).toBeChecked();
    });

    it('enables metadata checkbox when path provided', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          name: 'test',
          images: {
            path: 'data/{id}.tif',
            metadata: 'meta/{id}.json',
          },
        });
      });
      
      const metadataCheckbox = screen.getAllByRole('checkbox')[1];
      expect(metadataCheckbox).toBeChecked();
    });
  });

  describe('PathListEditor integration', () => {
    it('gets path data from PathListEditor', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      // PathListEditor should have default value
      const data = ref.current?.getData();
      expect(data.images.path).toBe('images/{id}.tif');
    });

    it('sets path data to PathListEditor', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          name: 'test',
          images: {
            path: {
              Sentinel1: 'data/{id}/s1.tif',
              Sentinel2: 'data/{id}/s2.tif',
            },
          },
        });
      });
      
      const data = ref.current?.getData();
      expect(data.images.path).toEqual({
        Sentinel1: 'data/{id}/s1.tif',
        Sentinel2: 'data/{id}/s2.tif',
      });
    });
  });

  describe('Thumbnails toggle', () => {
    it('shows input field when checkbox is checked', () => {
      render(<GeneralSection />);
      
      expect(screen.queryByPlaceholderText('thumbnails/{id}.png')).not.toBeInTheDocument();
      
      const thumbnailCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(thumbnailCheckbox);
      
      expect(screen.getByPlaceholderText('thumbnails/{id}.png')).toBeInTheDocument();
    });
  });

  describe('Metadata toggle', () => {
    it('shows input field when checkbox is checked', () => {
      render(<GeneralSection />);
      
      expect(screen.queryByPlaceholderText('metadata/{id}.json')).not.toBeInTheDocument();
      
      const metadataCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(metadataCheckbox);
      
      expect(screen.getByPlaceholderText('metadata/{id}.json')).toBeInTheDocument();
    });
  });
});

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
        port: 5000,
        host: '127.0.0.1',
        images: {
          path: 'images/{id}.tif',
          shape: [0, 0],
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
      
      const portInput = screen.getByDisplayValue('5000');
      fireEvent.change(portInput, { target: { value: '6060' } });
      
      const hostInput = screen.getByDisplayValue('127.0.0.1');
      fireEvent.change(hostInput, { target: { value: '0.0.0.0' } });
      
      const data = ref.current?.getData();
      expect(data.name).toBe('my-project');
      expect(data.port).toBe(6060);
      expect(data.host).toBe('0.0.0.0');
    });

    it('returns shape as array of numbers', () => {
      const ref = React.createRef<any>();
      const { container } = render(<GeneralSection ref={ref} />);
      
      // Find shape inputs by their labels
      const numberInputs = container.querySelectorAll('input[type="number"]');
      const shape1Input = Array.from(numberInputs).find(input => 
        (input as HTMLInputElement).placeholder === '512'
      ) as HTMLInputElement;
      const shape2Input = Array.from(numberInputs).filter(input => 
        (input as HTMLInputElement).placeholder === '512'
      )[1] as HTMLInputElement;
      
      fireEvent.change(shape1Input, { target: { value: '1024' } });
      fireEvent.change(shape2Input, { target: { value: '768' } });
      
      const data = ref.current?.getData();
      expect(data.images.shape).toEqual([1024, 768]);
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
          port: 8080,
          host: '192.168.1.1',
          images: {
            path: 'data/{id}.tif',
            shape: [512, 512],
            thumbnails: 'thumbs/{id}.png',
            metadata: 'meta/{id}.json',
          },
        });
      });
      
      expect(screen.getByDisplayValue('test-project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('8080')).toBeInTheDocument();
      expect(screen.getByDisplayValue('192.168.1.1')).toBeInTheDocument();
      const shape512Inputs = screen.getAllByDisplayValue('512');
      expect(shape512Inputs.length).toBe(2); // Both shape fields should have 512
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
            shape: [512, 512],
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
            shape: [512, 512],
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
            shape: [512, 512],
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

  describe('Shape fields', () => {
    it('converts string to number in getData', () => {
      const ref = React.createRef<any>();
      const { container } = render(<GeneralSection ref={ref} />);
      
      const numberInputs = container.querySelectorAll('input[type="number"]');
      const shape1Input = Array.from(numberInputs).find(input => 
        (input as HTMLInputElement).placeholder === '512'
      ) as HTMLInputElement;
      fireEvent.change(shape1Input, { target: { value: '256' } });
      
      const data = ref.current?.getData();
      expect(typeof data.images.shape[0]).toBe('number');
      expect(data.images.shape[0]).toBe(256);
    });

    it('handles empty shape fields as 0', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      const data = ref.current?.getData();
      expect(data.images.shape).toEqual([0, 0]);
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

  describe('Port validation', () => {
    it('accepts valid port numbers', () => {
      const ref = React.createRef<any>();
      render(<GeneralSection ref={ref} />);
      
      const portInput = screen.getByDisplayValue('5000');
      fireEvent.change(portInput, { target: { value: '8080' } });
      
      const data = ref.current?.getData();
      expect(data.port).toBe(8080);
    });
  });
});

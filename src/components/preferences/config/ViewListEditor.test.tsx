import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '../../../test/test-utils';
import React from 'react';
import ViewListEditor from './ViewListEditor';

describe('ViewListEditor', () => {
  describe('getData()', () => {
    it('returns empty object when no views', () => {
      const ref = React.createRef<any>();
      render(<ViewListEditor ref={ref} />);
      
      const data = ref.current?.getData();
      expect(data).toEqual({});
    });

    it('returns monochrome view with single string data', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ViewListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInput = screen.getByPlaceholderText('e.g., RGB, Cirrus, NDVI');
      fireEvent.change(keyInput, { target: { value: 'Cirrus' } });
      
      const dataInput = screen.getByPlaceholderText('e.g., $Sentinel2.B11**0.8*5');
      fireEvent.change(dataInput, { target: { value: '$B10' } });
      
      // Clear the default cmap value to test omission
      const textInputs = container.querySelectorAll('input[type="text"]');
      const cmapInput = Array.from(textInputs).find(input => 
        (input as HTMLInputElement).value === 'jet'
      ) as HTMLInputElement;
      fireEvent.change(cmapInput, { target: { value: '' } });
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        Cirrus: {
          type: 'image',
          data: '$B10',
        },
      });
    });

    it('returns RGB view with array of 3 strings', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ViewListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInput = screen.getByPlaceholderText('e.g., RGB, Cirrus, NDVI');
      fireEvent.change(keyInput, { target: { value: 'RGB' } });
      
      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'RGB' } });
      
      const redInput = screen.getByPlaceholderText('e.g., $Sentinel2.B5');
      const greenInput = screen.getByPlaceholderText('e.g., $Sentinel2.B4');
      const blueInput = screen.getByPlaceholderText('e.g., $Sentinel2.B3');
      
      fireEvent.change(redInput, { target: { value: '$B4' } });
      fireEvent.change(greenInput, { target: { value: '$B3' } });
      fireEvent.change(blueInput, { target: { value: '$B2' } });
      
      // Clear the default cmap value
      const textInputs = container.querySelectorAll('input[type="text"]');
      const cmapInput = Array.from(textInputs).find(input => 
        (input as HTMLInputElement).value === 'jet'
      ) as HTMLInputElement;
      fireEvent.change(cmapInput, { target: { value: '' } });
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        RGB: {
          type: 'image',
          data: ['$B4', '$B3', '$B2'],
        },
      });
    });

    it('returns Bing Map view without data field', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ViewListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInput = screen.getByPlaceholderText('e.g., RGB, Cirrus, NDVI');
      fireEvent.change(keyInput, { target: { value: 'BingMap' } });
      
      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'Bing Map' } });
      
      // Clear the default cmap value (even though Bing Map shouldn't use it)
      const textInputs = container.querySelectorAll('input[type="text"]');
      const cmapInput = Array.from(textInputs).find(input => 
        (input as HTMLInputElement).value === 'jet'
      ) as HTMLInputElement;
      if (cmapInput) {
        fireEvent.change(cmapInput, { target: { value: '' } });
      }
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        BingMap: {
          type: 'bingmap',
        },
      });
    });

    it('includes description when not empty', () => {
      const ref = React.createRef<any>();
      render(<ViewListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInput = screen.getByPlaceholderText('e.g., RGB, Cirrus, NDVI');
      fireEvent.change(keyInput, { target: { value: 'RGB' } });
      
      const descInput = screen.getByPlaceholderText('e.g., Normal RGB image');
      fireEvent.change(descInput, { target: { value: 'Standard RGB composite' } });
      
      const data = ref.current?.getData();
      expect(data.RGB.description).toBe('Standard RGB composite');
    });

    it('includes optional fields when provided', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ViewListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInput = screen.getByPlaceholderText('e.g., RGB, Cirrus, NDVI');
      fireEvent.change(keyInput, { target: { value: 'Cirrus' } });
      
      const textInputs = container.querySelectorAll('input[type="text"]');
      const cmapInput = Array.from(textInputs).find(input => 
        (input as HTMLInputElement).value === 'jet'
      ) as HTMLInputElement;
      fireEvent.change(cmapInput, { target: { value: 'viridis' } });
      
      const clipInput = screen.getByPlaceholderText('Clip option 2');
      fireEvent.change(clipInput, { target: { value: '2' } });
      
      const vminInput = screen.getByPlaceholderText('Vmin option 2');
      fireEvent.change(vminInput, { target: { value: '0' } });
      
      const vmaxInput = screen.getByPlaceholderText('Vmax option 2');
      fireEvent.change(vmaxInput, { target: { value: '100' } });
      
      const data = ref.current?.getData();
      expect(data.Cirrus).toMatchObject({
        cmap: 'viridis',
        clip: 2,
        vmin: 0,
        vmax: 100,
      });
    });
  });

  describe('setData()', () => {
    it('loads monochrome view with string data', () => {
      const ref = React.createRef<any>();
      render(<ViewListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          Cirrus: {
            type: 'image',
            data: '$B10',
            description: 'Cirrus band',
          },
        });
      });
      
      expect(screen.getByDisplayValue('Cirrus')).toBeInTheDocument();
      expect(screen.getByDisplayValue('$B10')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Cirrus band')).toBeInTheDocument();
    });

    it('loads RGB view with array data', () => {
      const ref = React.createRef<any>();
      render(<ViewListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          RGB: {
            type: 'image',
            data: ['$B4', '$B3', '$B2'],
          },
        });
      });
      
      expect(screen.getByDisplayValue('RGB')).toBeInTheDocument();
      expect(screen.getByDisplayValue('$B4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('$B3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('$B2')).toBeInTheDocument();
    });

    it('loads Bing Map view', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ViewListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          BingMap: {
            type: 'bingmap',
          },
        });
      });
      
      expect(screen.getByDisplayValue('BingMap')).toBeInTheDocument();
      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      expect(typeSelect.value).toBe('Bing Map');
    });

    it('handles monochrome data wrapped in single-element array', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ViewListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          Cirrus: {
            type: 'image',
            data: ['$B10'],
          },
        });
      });
      
      expect(screen.getByDisplayValue('$B10')).toBeInTheDocument();
      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      expect(typeSelect.value).toBe('Monochrome');
    });

    it('loads optional fields', () => {
      const ref = React.createRef<any>();
      render(<ViewListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          Cirrus: {
            type: 'image',
            data: '$B10',
            cmap: 'viridis',
            clip: 2,
            vmin: 0,
            vmax: 100,
          },
        });
      });
      
      expect(screen.getByDisplayValue('viridis')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });
  });

  describe('View type switching', () => {
    it('shows RGB data fields for RGB type', () => {
      const { container } = render(<ViewListEditor />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'RGB' } });
      
      expect(screen.getByPlaceholderText('e.g., $Sentinel2.B5')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., $Sentinel2.B4')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., $Sentinel2.B3')).toBeInTheDocument();
    });

    it('shows info message for Bing Map type', () => {
      const { container } = render(<ViewListEditor />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const typeSelect = container.querySelector('select') as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'Bing Map' } });
      
      expect(screen.getByText(/Bing Map views don't require a data field/)).toBeInTheDocument();
    });
  });

  describe('Add/Remove functionality', () => {
    it('adds new view when clicking Add button', () => {
      render(<ViewListEditor />);
      
      expect(screen.queryByPlaceholderText('e.g., RGB, Cirrus, NDVI')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByText('+ Add'));
      
      expect(screen.getByPlaceholderText('e.g., RGB, Cirrus, NDVI')).toBeInTheDocument();
    });

    it('removes view when clicking Remove button', () => {
      const ref = React.createRef<any>();
      render(<ViewListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInputs = screen.getAllByPlaceholderText('e.g., RGB, Cirrus, NDVI');
      fireEvent.change(keyInputs[0], { target: { value: 'View1' } });
      fireEvent.change(keyInputs[1], { target: { value: 'View2' } });
      
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);
      
      expect(screen.queryByDisplayValue('View1')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('View2')).toBeInTheDocument();
    });
  });

  describe('Multiple views', () => {
    it('handles multiple views correctly', () => {
      const ref = React.createRef<any>();
      render(<ViewListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInputs = screen.getAllByPlaceholderText('e.g., RGB, Cirrus, NDVI');
      fireEvent.change(keyInputs[0], { target: { value: 'RGB' } });
      fireEvent.change(keyInputs[1], { target: { value: 'Cirrus' } });
      
      const data = ref.current?.getData();
      expect(Object.keys(data)).toEqual(['RGB', 'Cirrus']);
    });
  });
});

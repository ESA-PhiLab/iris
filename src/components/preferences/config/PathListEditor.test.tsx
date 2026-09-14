import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '../../../test/test-utils';
import React from 'react';
import PathListEditor from './PathListEditor';

describe('PathListEditor', () => {
  describe('getData()', () => {
    it('returns string when single path without key', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      const data = ref.current?.getData();
      expect(data).toBe('images/{id}.tif');
    });

    it('returns object when single path with key', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      const keyInput = screen.getByPlaceholderText('optional key (e.g. Sentinel2)');
      fireEvent.change(keyInput, { target: { value: 'Sentinel1' } });
      
      const data = ref.current?.getData();
      expect(data).toEqual({ Sentinel1: 'images/{id}.tif' });
    });

    it('returns object when multiple paths', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      // Add second path
      fireEvent.click(screen.getByText('+ Add path'));
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        path1: 'images/{id}.tif',
        path2: '',
      });
    });

    it('uses provided keys in object output', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      // Add second path
      fireEvent.click(screen.getByText('+ Add path'));
      
      const keyInputs = screen.getAllByPlaceholderText('optional key (e.g. Sentinel2)');
      fireEvent.change(keyInputs[0], { target: { value: 'Sentinel1' } });
      fireEvent.change(keyInputs[1], { target: { value: 'Sentinel2' } });
      
      const valueInputs = screen.getAllByPlaceholderText('images/{id}.tif');
      fireEvent.change(valueInputs[1], { target: { value: 'images/{id}/s2.tif' } });
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        Sentinel1: 'images/{id}.tif',
        Sentinel2: 'images/{id}/s2.tif',
      });
    });
  });

  describe('setData()', () => {
    it('handles string input', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData('custom/path/{id}.png');
      });
      
      const data = ref.current?.getData();
      expect(data).toBe('custom/path/{id}.png');
    });

    it('handles object input with single entry', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData({ Sentinel1: 'data/{id}/s1.tif' });
      });
      
      const data = ref.current?.getData();
      expect(data).toEqual({ Sentinel1: 'data/{id}/s1.tif' });
    });

    it('handles object input with multiple entries', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData({
          Sentinel1: 'data/{id}/s1.tif',
          Sentinel2: 'data/{id}/s2.tif',
        });
      });
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        Sentinel1: 'data/{id}/s1.tif',
        Sentinel2: 'data/{id}/s2.tif',
      });
    });
  });

  describe('Add/Remove functionality', () => {
    it('adds new path when clicking Add button', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      expect(screen.getByText('Path-1 *')).toBeInTheDocument();
      expect(screen.queryByText('Path-2 *')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByText('+ Add path'));
      
      expect(screen.getByText('Path-2 *')).toBeInTheDocument();
    });

    it('removes path when clicking Remove button', () => {
      const ref = React.createRef<any>();
      render(<PathListEditor ref={ref} />);
      
      // Add second path
      fireEvent.click(screen.getByText('+ Add path'));
      expect(screen.getByText('Path-2 *')).toBeInTheDocument();
      
      // Remove second path
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[1]);
      
      expect(screen.queryByText('Path-2 *')).not.toBeInTheDocument();
    });

    it('shows Remove buttons when multiple paths exist', () => {
      render(<PathListEditor />);
      
      fireEvent.click(screen.getByText('+ Add path'));
      
      const removeButtons = screen.getAllByText('Remove');
      expect(removeButtons).toHaveLength(2);
    });
  });
});

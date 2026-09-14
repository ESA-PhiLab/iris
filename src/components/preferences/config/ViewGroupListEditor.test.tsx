import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '../../../test/test-utils';
import React from 'react';
import ViewGroupListEditor from './ViewGroupListEditor';

describe('ViewGroupListEditor', () => {
  const mockGetAvailableViews = () => ['RGB', 'Cirrus', 'NDVI', 'Snow'];

  describe('getData()', () => {
    it('returns empty object when no groups', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={() => []} />);
      
      const data = ref.current?.getData();
      expect(data).toEqual({});
    });

    it('returns group with key and views array', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInput = screen.getByPlaceholderText('e.g., default');
      fireEvent.change(keyInput, { target: { value: 'default' } });
      
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      fireEvent.click(screen.getByText('Add'));
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        default: ['RGB'],
      });
    });

    it('returns multiple views in group', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInput = screen.getByPlaceholderText('e.g., default');
      fireEvent.change(keyInput, { target: { value: 'default' } });
      
      const dropdown = screen.getByRole('combobox');
      
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      fireEvent.click(screen.getByText('Add'));
      
      fireEvent.change(dropdown, { target: { value: 'Cirrus' } });
      fireEvent.click(screen.getByText('Add'));
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        default: ['RGB', 'Cirrus'],
      });
    });

    it('returns multiple groups', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInputs = screen.getAllByPlaceholderText('e.g., default');
      fireEvent.change(keyInputs[0], { target: { value: 'default' } });
      fireEvent.change(keyInputs[1], { target: { value: 'radar' } });
      
      const data = ref.current?.getData();
      expect(data).toEqual({
        default: [],
        radar: [],
      });
    });
  });

  describe('setData()', () => {
    it('loads groups correctly', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      act(() => {
        ref.current?.setData({
          default: ['RGB', 'Cirrus'],
          radar: ['Snow'],
        });
      });
      
      expect(screen.getByDisplayValue('default')).toBeInTheDocument();
      expect(screen.getByDisplayValue('radar')).toBeInTheDocument();
      
      // Verify the data was loaded correctly by checking getData()
      const data = ref.current?.getData();
      expect(data).toEqual({
        default: ['RGB', 'Cirrus'],
        radar: ['Snow'],
      });
    });

    it('handles empty views array', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      act(() => {
        ref.current?.setData({
          default: [],
        });
      });
      
      expect(screen.getByDisplayValue('default')).toBeInTheDocument();
      expect(screen.getByText('No views added yet')).toBeInTheDocument();
    });
  });

  describe('Add/Remove group functionality', () => {
    it('adds new group when clicking Add button', () => {
      render(<ViewGroupListEditor getAvailableViews={mockGetAvailableViews} />);
      
      expect(screen.queryByText('Group 1')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByText('+ Add'));
      
      expect(screen.getByText('Group 1')).toBeInTheDocument();
    });

    it('removes group when clicking Remove button', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      fireEvent.click(screen.getByText('+ Add'));
      
      const keyInputs = screen.getAllByPlaceholderText('e.g., default');
      fireEvent.change(keyInputs[0], { target: { value: 'group1' } });
      fireEvent.change(keyInputs[1], { target: { value: 'group2' } });
      
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);
      
      expect(screen.queryByDisplayValue('group1')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('group2')).toBeInTheDocument();
    });
  });

  describe('Add/Remove view from group', () => {
    it('adds view to group from dropdown', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      fireEvent.click(screen.getByText('Add'));
      
      expect(screen.getByText('RGB')).toBeInTheDocument();
    });

    it('removes view from group when clicking × button', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      fireEvent.click(screen.getByText('Add'));
      
      // RGB should be displayed as a tag
      const rgbTags = screen.getAllByText('RGB');
      expect(rgbTags.length).toBeGreaterThan(0);
      
      const removeButton = screen.getByTitle('Remove view');
      fireEvent.click(removeButton);
      
      // RGB should no longer be in the tags, but might still be in dropdown
      const data = ref.current?.getData();
      expect(data['']).toEqual([]);
    });

    it('does not add duplicate views to group', () => {
      const ref = React.createRef<any>();
      render(<ViewGroupListEditor ref={ref} getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      fireEvent.click(screen.getByText('Add'));
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      fireEvent.click(screen.getByText('Add'));
      
      const data = ref.current?.getData();
      expect(data[''].length).toBe(1);
    });

    it('filters out already-added views from dropdown', () => {
      render(<ViewGroupListEditor getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      fireEvent.click(screen.getByText('Add'));
      
      // RGB should no longer be in dropdown
      const options = Array.from(dropdown.options).map(opt => opt.value);
      expect(options).not.toContain('RGB');
      expect(options).toContain('Cirrus');
      expect(options).toContain('NDVI');
      expect(options).toContain('Snow');
    });

    it('enables Add button when view selected', () => {
      render(<ViewGroupListEditor getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'RGB' } });
      
      const addButton = screen.getByText('Add');
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Empty state', () => {
    it('shows empty state when no views in group', () => {
      render(<ViewGroupListEditor getAvailableViews={mockGetAvailableViews} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      expect(screen.getByText('No views added yet')).toBeInTheDocument();
    });

    it('shows warning when no views available', () => {
      render(<ViewGroupListEditor getAvailableViews={() => []} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      expect(screen.getByText(/No views available/)).toBeInTheDocument();
    });
  });
});

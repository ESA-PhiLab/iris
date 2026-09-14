import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '../../../test/test-utils';
import React from 'react';
import ClassListEditor from './ClassListEditor';

describe('ClassListEditor', () => {
  describe('getData()', () => {
    it('returns empty array when no classes', () => {
      const ref = React.createRef<any>();
      render(<ClassListEditor ref={ref} />);
      
      const data = ref.current?.getData();
      expect(data).toEqual([]);
    });

    it('returns class with name and colour', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ClassListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      // Find the name input by looking for the input after the "Name *" label
      const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Cloud' } });
      
      const data = ref.current?.getData();
      expect(data).toEqual([
        {
          name: 'Cloud',
          colour: [255, 255, 255, 0],
        },
      ]);
    });

    it('includes description when not empty', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ClassListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const inputs = container.querySelectorAll('input[type="text"]');
      const nameInput = inputs[0] as HTMLInputElement;
      const descInput = screen.getByPlaceholderText('Optional description');
      
      fireEvent.change(nameInput, { target: { value: 'Cloud' } });
      fireEvent.change(descInput, { target: { value: 'White fluffy clouds' } });
      
      const data = ref.current?.getData();
      expect(data).toEqual([
        {
          name: 'Cloud',
          description: 'White fluffy clouds',
          colour: [255, 255, 255, 0],
        },
      ]);
    });

    it('includes user_colour when enabled', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ClassListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Cloud' } });
      
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const userColourCheckbox = checkboxes[0] as HTMLInputElement;
      fireEvent.click(userColourCheckbox);
      
      const data = ref.current?.getData();
      expect(data).toEqual([
        {
          name: 'Cloud',
          colour: [255, 255, 255, 0],
          user_colour: [0, 255, 255, 70],
        },
      ]);
    });
  });

  describe('setData()', () => {
    it('loads classes correctly', () => {
      const ref = React.createRef<any>();
      render(<ClassListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData([
          {
            name: 'Cloud',
            description: 'White clouds',
            colour: [255, 255, 0, 70],
          },
          {
            name: 'Shadow',
            colour: [0, 0, 0, 100],
            user_colour: [50, 50, 50, 100],
          },
        ]);
      });
      
      expect(screen.getByDisplayValue('Cloud')).toBeInTheDocument();
      expect(screen.getByDisplayValue('White clouds')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Shadow')).toBeInTheDocument();
    });

    it('enables user_colour checkbox when present', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ClassListEditor ref={ref} />);
      
      act(() => {
        ref.current?.setData([
          {
            name: 'Cloud',
            colour: [255, 255, 0, 70],
            user_colour: [100, 100, 100, 50],
          },
        ]);
      });
      
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('RGBA validation', () => {
    it('clamps colour values to 0-255 range', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ClassListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const numberInputs = container.querySelectorAll('input[type="number"]');
      const redInput = numberInputs[0] as HTMLInputElement;
      fireEvent.change(redInput, { target: { value: '300' } });
      
      const data = ref.current?.getData();
      expect(data[0].colour[0]).toBe(255);
    });

    it('updates all RGBA channels independently', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ClassListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const numberInputs = container.querySelectorAll('input[type="number"]');
      fireEvent.change(numberInputs[0], { target: { value: '100' } });
      fireEvent.change(numberInputs[1], { target: { value: '150' } });
      fireEvent.change(numberInputs[2], { target: { value: '200' } });
      fireEvent.change(numberInputs[3], { target: { value: '250' } });
      
      const data = ref.current?.getData();
      expect(data[0].colour).toEqual([100, 150, 200, 250]);
    });
  });

  describe('Add/Remove functionality', () => {
    it('adds new class when clicking Add button', () => {
      const { container } = render(<ClassListEditor />);
      
      expect(container.querySelector('input[type="text"]')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByText('+ Add'));
      
      expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
    });

    it('removes class when clicking Remove button', () => {
      const ref = React.createRef<any>();
      const { container } = render(<ClassListEditor ref={ref} />);
      
      fireEvent.click(screen.getByText('+ Add'));
      fireEvent.click(screen.getByText('+ Add'));
      
      const inputs = container.querySelectorAll('input[type="text"]');
      fireEvent.change(inputs[0], { target: { value: 'Class1' } });
      fireEvent.change(inputs[2], { target: { value: 'Class2' } });
      
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);
      
      expect(screen.queryByDisplayValue('Class1')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Class2')).toBeInTheDocument();
    });
  });

  describe('User colour toggle', () => {
    it('shows user colour inputs when checkbox is checked', () => {
      const { container } = render(<ClassListEditor />);
      
      fireEvent.click(screen.getByText('+ Add'));
      
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(checkbox);
      
      const numberInputs = container.querySelectorAll('input[type="number"]');
      expect(numberInputs.length).toBe(8); // 4 for colour + 4 for user_colour
    });
  });
});

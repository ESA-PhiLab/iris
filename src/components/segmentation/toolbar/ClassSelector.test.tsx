import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClassSelector from './ClassSelector';

describe('ClassSelector', () => {
  it('renders class selector with default text', () => {
    const { container } = render(<ClassSelector onSelectClass={vi.fn()} />);
    
    const selector = container.querySelector('#tb_select_class');
    expect(selector).toBeInTheDocument();
    expect(screen.getByText('No class')).toBeInTheDocument();
  });

  it('calls onSelectClass when clicked', () => {
    const handleSelect = vi.fn();
    const { container } = render(<ClassSelector onSelectClass={handleSelect} />);
    
    const selector = container.querySelector('#tb_select_class');
    if (selector) {
      fireEvent.click(selector);
      expect(handleSelect).toHaveBeenCalledTimes(1);
    }
  });
});

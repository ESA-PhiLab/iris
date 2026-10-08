import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import ToolButton from './ToolButton';

describe('ToolButton', () => {
  it('renders with icon and calls onClick', () => {
    const handleClick = vi.fn();
    render(
      <ToolButton
        icon="/test-icon.png"
        onClick={handleClick}
        testId="test-button"
      />
    );

    const button = screen.getByTestId('test-button');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows its title and shortcut in a tooltip', () => {
    render(
      <ToolButton
        icon="/test-icon.png"
        onClick={vi.fn()}
        title="Test Title"
        shortcut="draw"
        testId="test-button"
      />
    );

    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('data-tooltip', 'Test Title');
    expect(button).toHaveAttribute('data-shortcut', 'D');
  });
});

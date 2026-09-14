import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ToolbarSeparator from './ToolbarSeparator';

describe('ToolbarSeparator', () => {
  it('renders separator element', () => {
    const { container } = render(<ToolbarSeparator />);
    const separator = container.querySelector('.toolbar_separator');
    expect(separator).toBeInTheDocument();
  });
});

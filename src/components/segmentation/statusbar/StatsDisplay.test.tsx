import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StatsDisplay from './StatsDisplay';

describe('StatsDisplay', () => {
  it('renders stats with default values', () => {
    const { container } = render(<StatsDisplay />);
    
    const classesCount = container.querySelector('#different-classes');
    const pixelsCount = container.querySelector('#drawn-pixels');
    
    expect(classesCount).toBeInTheDocument();
    expect(classesCount?.textContent).toBe('0');
    expect(pixelsCount).toBeInTheDocument();
    expect(pixelsCount?.textContent).toBe('0');
  });
});

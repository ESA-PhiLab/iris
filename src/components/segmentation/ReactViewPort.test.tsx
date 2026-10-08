import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReactViewPort from './ReactViewPort';
import { ThemeProvider } from '../../contexts/ThemeContext';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

const mockView = {
  name: 'test-view',
  type: 'image' as const,
  description: 'Test view for unit testing',
};

describe('ReactViewPort', () => {
  it('renders with basic props', () => {
    const { container } = renderWithTheme(
      <ReactViewPort
        view={mockView}
        index={0}
        showControls={true}
        imageId="test-image"
      />
    );
    // Component uses flex layout with 100% height
    expect(container.firstChild).toHaveStyle({ 
      height: '100%',
      position: 'relative',
    });
  });

  it('renders with controls hidden', () => {
    const { container } = renderWithTheme(
      <ReactViewPort
        view={mockView}
        index={0}
        showControls={false}
        imageId="test-image"
      />
    );
    // Component uses flex layout with 100% height
    expect(container.firstChild).toHaveStyle({ 
      height: '100%',
      position: 'relative',
    });
  });
});
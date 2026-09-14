import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReactBaseLayer from './ReactBaseLayer';

const mockView = {
  name: 'test-view',
  type: 'image' as const,
  description: 'Test view for unit testing',
};

describe('ReactBaseLayer', () => {
  it('renders with basic props', () => {
    const { container } = render(
      <ReactBaseLayer
        view={mockView}
        width={400}
        height={300}
        zIndex={1}
      >
        <div>Test content</div>
      </ReactBaseLayer>
    );
    // Component now uses responsive 100% width/height instead of fixed pixels
    expect(container.firstChild).toHaveStyle({ width: '100%', height: '100%' });
  });

  it('applies custom className', () => {
    const { container } = render(
      <ReactBaseLayer
        view={mockView}
        width={400}
        height={300}
        zIndex={1}
        className="custom-layer"
      >
        <div>Test content</div>
      </ReactBaseLayer>
    );
    expect(container.firstChild).toHaveClass('custom-layer');
  });
});
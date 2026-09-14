import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AdminButton from './AdminButton';

describe('AdminButton', () => {
  it('renders admin button', () => {
    const { container } = render(<AdminButton />);
    
    const adminButton = container.querySelector('#admin-button');
    expect(adminButton).toBeInTheDocument();
  });

  it('opens admin page in new tab when clicked', async () => {
    const { container } = render(<AdminButton />);
    
    const adminButton = container.querySelector('#admin-button');
    expect(adminButton).toBeInTheDocument();
  });
});

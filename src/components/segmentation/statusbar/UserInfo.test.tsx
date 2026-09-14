import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserInfo from './UserInfo';

describe('UserInfo', () => {
  it('renders user info with default text', () => {
    const { container } = render(<UserInfo onOpenProfile={vi.fn()} />);
    
    const userInfo = container.querySelector('#user-info');
    expect(userInfo).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('calls onOpenProfile when clicked', () => {
    const handleOpenProfile = vi.fn();
    const { container } = render(<UserInfo onOpenProfile={handleOpenProfile} />);
    
    const userInfo = container.querySelector('#user-info');
    if (userInfo) {
      fireEvent.click(userInfo);
      expect(handleOpenProfile).toHaveBeenCalledTimes(1);
    }
  });
});

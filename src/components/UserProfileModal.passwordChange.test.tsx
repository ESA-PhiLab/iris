import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UserProfileModal } from './UserProfileModal';
import { ThemeProvider } from '../contexts/ThemeContext';
import type { UserProfile } from '../types/iris';

/** Helper to render with ThemeProvider */
function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('UserProfileModal - Password Change', () => {
  const mockProfile: UserProfile = {
    id: 1,
    name: 'testuser',
    email: 'test@example.com',
    admin: false,
    tested: true,
    created: '2024-01-01T00:00:00',
    image_seed: 12345,
    segmentation: {
      score: 100,
      score_unverified: 10,
      n_masks: 5,
      rank: 1,
      last_masks: []
    },
    is_current_user: true
  };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('shows change password button for current user', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });
  });

  it('does not show change password button for other users', async () => {
    const otherUserProfile = { ...mockProfile, is_current_user: false };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => otherUserProfile
    });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} userId="2" />);

    await waitFor(() => {
      expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
    });
  });

  it('shows password change form when button is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    const changePasswordButton = screen.getByText('Change Password');
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/New Password \(min 4 characters\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    });
  });

  it('validates password fields before submission', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    // Try to submit without filling fields
    const submitButton = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Current password is required/i)).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/New Password \(min 4 characters\)/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpass' } });
    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });

    const submitButton = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/at least 4 characters/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/New Password \(min 4 characters\)/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });

    const submitButton = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
  });

  it('successfully changes password', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password changed successfully' })
      });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/New Password \(min 4 characters\)/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    const submitButton = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Password changed successfully/i)).toBeInTheDocument();
    });

    // Verify API was called with correct data
    expect(global.fetch).toHaveBeenCalledWith(
      '/user/api/change-password',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: 'oldpass123',
          new_password: 'newpass123',
          confirm_password: 'newpass123',
        }),
      })
    );
  });

  it('displays error when current password is incorrect', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Current password is incorrect' })
      });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/New Password \(min 4 characters\)/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'wrongpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    const submitButton = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Current password is incorrect/i)).toBeInTheDocument();
    });
  });

  it('allows canceling password change', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    renderWithTheme(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByLabelText(/Current Password/i)).not.toBeInTheDocument();
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });
  });
});

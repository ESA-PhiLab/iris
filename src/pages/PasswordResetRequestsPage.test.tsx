import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PasswordResetRequestsPage from './PasswordResetRequestsPage';

describe('PasswordResetRequestsPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    // Mock window.location.href for mailto links
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    
    render(<PasswordResetRequestsPage />);
    
    expect(screen.getByText('Loading password reset requests...')).toBeInTheDocument();
  });

  it('renders empty state when no requests', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requests: [] })
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('No password reset requests.')).toBeInTheDocument();
    });
  });

  it('renders pending requests', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: [
          {
            id: 1,
            user_id: 5,
            username: 'john_doe',
            email: 'john@example.com',
            requested_at: '2024-01-01T12:00:00',
            resolved: false,
            resolved_at: null,
            resolved_by_user_id: null
          }
        ]
      })
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending Requests (1)')).toBeInTheDocument();
      expect(screen.getByText('john_doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('renders resolved requests separately', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: [
          {
            id: 1,
            user_id: 5,
            username: 'john_doe',
            email: 'john@example.com',
            requested_at: '2024-01-01T12:00:00',
            resolved: false,
            resolved_at: null,
            resolved_by_user_id: null
          },
          {
            id: 2,
            user_id: 6,
            username: 'jane_smith',
            email: 'jane@example.com',
            requested_at: '2024-01-02T12:00:00',
            resolved: true,
            resolved_at: '2024-01-03T12:00:00',
            resolved_by_user_id: 1
          }
        ]
      })
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending Requests (1)')).toBeInTheDocument();
      expect(screen.getByText('Resolved Requests (1)')).toBeInTheDocument();
    });
  });

  it('shows "No email" for users without email', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: [
          {
            id: 1,
            user_id: 5,
            username: 'noemail_user',
            email: null,
            requested_at: '2024-01-01T12:00:00',
            resolved: false,
            resolved_at: null,
            resolved_by_user_id: null
          }
        ]
      })
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('No email')).toBeInTheDocument();
    });
  });

  it('disables generate button for users without email', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: [
          {
            id: 1,
            user_id: 5,
            username: 'noemail_user',
            email: null,
            requested_at: '2024-01-01T12:00:00',
            resolved: false,
            resolved_at: null,
            resolved_by_user_id: null
          }
        ]
      })
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Generate & Send Password/i });
      expect(button).toBeDisabled();
    });
  });

  it('generates temporary password and opens mailto link', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 1,
              user_id: 5,
              username: 'john_doe',
              email: 'john@example.com',
              requested_at: '2024-01-01T12:00:00',
              resolved: false,
              resolved_at: null,
              resolved_by_user_id: null
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          temporary_password: 'abc123XY',
          email: 'john@example.com',
          username: 'john_doe'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 1,
              user_id: 5,
              username: 'john_doe',
              email: 'john@example.com',
              requested_at: '2024-01-01T12:00:00',
              resolved: true,
              resolved_at: '2024-01-01T13:00:00',
              resolved_by_user_id: 1
            }
          ]
        })
      });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('john_doe')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate & Send Password/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      // Check that mailto link was set
      expect(window.location.href).toContain('mailto:john@example.com');
      expect(window.location.href).toContain('abc123XY');
      expect(window.location.href).toContain('john_doe');
    });

    // Verify API was called
    expect(global.fetch).toHaveBeenCalledWith(
      '/admin/api/password-reset-requests/1/generate-password',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('button is disabled when user has no email', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: [
          {
            id: 1,
            user_id: 5,
            username: 'noemail_user',
            email: null,
            requested_at: '2024-01-01T12:00:00',
            resolved: false,
            resolved_at: null,
            resolved_by_user_id: null
          }
        ]
      })
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('noemail_user')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate & Send Password/i });
    
    // Button should be disabled for users without email
    expect(generateButton).toBeDisabled();
    expect(generateButton).toHaveAttribute('title', 'User has no email address');
  });

  it('shows alert on generation error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 1,
              user_id: 5,
              username: 'john_doe',
              email: 'john@example.com',
              requested_at: '2024-01-01T12:00:00',
              resolved: false,
              resolved_at: null,
              resolved_by_user_id: null
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => 'This request has already been resolved'
      });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('john_doe')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate & Send Password/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to generate password: This request has already been resolved'
      );
    });

    alertSpy.mockRestore();
  });

  it('disables button while generating password', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 1,
              user_id: 5,
              username: 'john_doe',
              email: 'john@example.com',
              requested_at: '2024-01-01T12:00:00',
              resolved: false,
              resolved_at: null,
              resolved_by_user_id: null
            }
          ]
        })
      })
      .mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            temporary_password: 'abc123XY',
            email: 'john@example.com',
            username: 'john_doe'
          })
        }), 100))
      );

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('john_doe')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate & Send Password/i });
    fireEvent.click(generateButton);

    // Button should show "Generating..." and be disabled
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
    });
  });

  it('formats dates correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: [
          {
            id: 1,
            user_id: 5,
            username: 'john_doe',
            email: 'john@example.com',
            requested_at: '2024-01-15T14:30:00',
            resolved: false,
            resolved_at: null,
            resolved_by_user_id: null
          }
        ]
      })
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      // Date should be formatted using toLocaleString
      const dateText = screen.getByText(/1\/15\/2024/i);
      expect(dateText).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load password reset requests')).toBeInTheDocument();
    });
  });

  it('handles non-ok response gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load password reset requests')).toBeInTheDocument();
    });
  });

  it('refreshes list after successful password generation', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 1,
              user_id: 5,
              username: 'john_doe',
              email: 'john@example.com',
              requested_at: '2024-01-01T12:00:00',
              resolved: false,
              resolved_at: null,
              resolved_by_user_id: null
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          temporary_password: 'abc123XY',
          email: 'john@example.com',
          username: 'john_doe'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 1,
              user_id: 5,
              username: 'john_doe',
              email: 'john@example.com',
              requested_at: '2024-01-01T12:00:00',
              resolved: true,
              resolved_at: '2024-01-01T13:00:00',
              resolved_by_user_id: 1
            }
          ]
        })
      });

    render(<PasswordResetRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending Requests (1)')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate & Send Password/i });
    fireEvent.click(generateButton);

    // After generation, should show resolved requests
    await waitFor(() => {
      expect(screen.getByText('Resolved Requests (1)')).toBeInTheDocument();
      expect(screen.queryByText('Pending Requests')).not.toBeInTheDocument();
    });
  });
});

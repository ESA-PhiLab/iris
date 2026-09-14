import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { ThemeProvider } from '../contexts/ThemeContext';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('LoginForm - Forgot Password Mode', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('shows forgot password button in login mode', () => {
    renderWithTheme(<LoginForm />);
    
    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
  });

  it('switches to forgot password mode when button clicked', () => {
    renderWithTheme(<LoginForm />);
    
    const forgotPasswordButton = screen.getByText('Forgot Password?');
    fireEvent.click(forgotPasswordButton);
    
    expect(screen.getByRole('heading', { name: 'Forgot Password' })).toBeInTheDocument();
    expect(screen.getByText('Username:')).toBeInTheDocument();
    expect(screen.queryByText('Password:')).not.toBeInTheDocument();
  });

  it('shows back to login button in forgot password mode', () => {
    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    expect(screen.getByText('Back to Login')).toBeInTheDocument();
  });

  it('switches back to login mode from forgot password', () => {
    renderWithTheme(<LoginForm />);
    
    // Go to forgot password mode
    fireEvent.click(screen.getByText('Forgot Password?'));
    expect(screen.getByRole('heading', { name: 'Forgot Password' })).toBeInTheDocument();
    
    // Go back to login
    fireEvent.click(screen.getByText('Back to Login'));
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Password:')).toBeInTheDocument();
  });

  it('validates username is required in forgot password mode', async () => {
    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
  });

  it('submits forgot password request successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'Password reset request submitted successfully! An administrator will process your request.'
    });

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/successfully/i)).toBeInTheDocument();
    });

    // Verify API was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      '/user/request-password-reset',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'testuser' }),
      })
    );
  });

  it('displays error when user not found', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'User not found!'
    });

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'nonexistent' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('User not found!')).toBeInTheDocument();
    });
  });

  it('displays error when user has no email', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'This user has no email address on file. Please contact an administrator directly.'
    });

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'noemail' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/no email address/i)).toBeInTheDocument();
    });
  });

  it('displays error when request already pending', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'A password reset request is already pending for this user.'
    });

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/already pending/i)).toBeInTheDocument();
    });
  });

  it('clears form when switching modes', () => {
    renderWithTheme(<LoginForm />);
    
    // Fill in login form
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    // Switch to forgot password
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    // Username should be cleared
    const clearedInput = screen.getByRole('textbox');
    expect(clearedInput).toHaveValue('');
  });

  it('clears error when switching modes', async () => {
    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    // Trigger error
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
    
    // Switch back to login
    fireEvent.click(screen.getByText('Back to Login'));
    
    // Error should be cleared
    expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
  });

  it('clears success message when switching modes', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'Password reset request submitted successfully!'
    });

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/successfully/i)).toBeInTheDocument();
    });
    
    // Switch back to login
    fireEvent.click(screen.getByText('Back to Login'));
    
    // Success message should be cleared
    expect(screen.queryByText(/successfully/i)).not.toBeInTheDocument();
  });

  it('disables submit button while loading', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        text: async () => 'Success'
      }), 100))
    );

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    // Button should be disabled during request
    expect(submitButton).toBeDisabled();
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('disables back button while loading', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        text: async () => 'Success'
      }), 100))
    );

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    // Back button should be disabled during request
    const backButton = screen.getByText('Back to Login');
    expect(backButton).toBeDisabled();
    
    await waitFor(() => {
      expect(backButton).not.toBeDisabled();
    });
  });

  it('can initialize in forgot password mode', () => {
    renderWithTheme(<LoginForm initialMode="forgot-password" />);
    
    expect(screen.getByRole('heading', { name: 'Forgot Password' })).toBeInTheDocument();
    expect(screen.queryByText('Password:')).not.toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    renderWithTheme(<LoginForm />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    const submitButton = screen.getByRole('button', { name: 'Request Reset' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });
});

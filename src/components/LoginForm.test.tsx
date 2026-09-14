import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { ThemeProvider } from '../contexts/ThemeContext';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('LoginForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders login form by default', () => {
    renderWithTheme(<LoginForm />);
    expect(screen.getByText('Username:')).toBeInTheDocument();
    expect(screen.getByText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    renderWithTheme(<LoginForm />);
    
    const registerButton = screen.getByText('I have no account yet');
    fireEvent.click(registerButton);
    
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByText('Retype Password:')).toBeInTheDocument();
    expect(screen.getByText('I have already an account')).toBeInTheDocument();
  });

  it('switches back to login mode', () => {
    renderWithTheme(<LoginForm />);
    
    // Switch to register
    fireEvent.click(screen.getByText('I have no account yet'));
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    
    // Switch back to login
    fireEvent.click(screen.getByText('I have already an account'));
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('shows error for empty username', async () => {
    renderWithTheme(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
  });

  it('shows error for empty password', async () => {
    renderWithTheme(<LoginForm />);
    
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('submits login form successfully', async () => {
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'Successful login!'
    });

    const { container } = renderWithTheme(<LoginForm />);
    
    const usernameInput = container.querySelector('#login-username') as HTMLInputElement;
    const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/user/login', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' })
      }));
    });
  });

  it('displays error message on login failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Invalid credentials'
    });

    const { container } = renderWithTheme(<LoginForm />);
    
    const usernameInput = container.querySelector('#login-username') as HTMLInputElement;
    const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback on successful login', async () => {
    const onSuccess = vi.fn();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'Successful login!'
    });

    const { container } = renderWithTheme(<LoginForm onSuccess={onSuccess} />);
    
    const usernameInput = container.querySelector('#login-username') as HTMLInputElement;
    const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('validates username length', async () => {
    const { container } = renderWithTheme(<LoginForm />);
    
    const usernameInput = container.querySelector('#login-username') as HTMLInputElement;
    const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
    
    // Create a string longer than 64 characters
    const longUsername = 'a'.repeat(65);
    fireEvent.change(usernameInput, { target: { value: longUsername } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Username is too long/)).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    const { container } = renderWithTheme(<LoginForm />);
    
    const usernameInput = container.querySelector('#login-username') as HTMLInputElement;
    const passwordInput = container.querySelector('#login-password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    // Create a string longer than 64 characters
    const longPassword = 'a'.repeat(65);
    fireEvent.change(passwordInput, { target: { value: longPassword } });
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Password is too long/)).toBeInTheDocument();
    });
  });

  it('validates password match in register mode', async () => {
    const { container } = renderWithTheme(<LoginForm />);
    
    // Switch to register mode
    fireEvent.click(screen.getByText('I have no account yet'));
    
    const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
    const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
    const passwordAgainInput = container.querySelector('#register-password-again') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(passwordAgainInput, { target: { value: 'password456' } });
    
    const submitButton = screen.getByRole('button', { name: 'Register' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('The passwords are not identical!')).toBeInTheDocument();
    });
  });
});

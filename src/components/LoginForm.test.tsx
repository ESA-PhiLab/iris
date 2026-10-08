import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Backend, setBackend } from '../services/backend';

const signIn = vi.fn();
const enterAsGuest = vi.fn();
const signInOptions = vi.fn();
setBackend({ signIn, enterAsGuest, signInOptions } as unknown as Backend);

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const fillIn = (container: HTMLElement, username: string, password: string) => {
  fireEvent.change(container.querySelector('#login-username')!, { target: { value: username } });
  fireEvent.change(container.querySelector('#login-password')!, { target: { value: password } });
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInOptions.mockReturnValue({ guest: true });
  });

  it('renders login form by default', () => {
    renderWithTheme(<LoginForm />);
    expect(screen.getByText('Username:')).toBeInTheDocument();
    expect(screen.getByText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('enters as guest without an account', async () => {
    const onSuccess = vi.fn();
    enterAsGuest.mockResolvedValue(undefined);
    renderWithTheme(<LoginForm onSuccess={onSuccess} />);

    fireEvent.click(screen.getByText('Continue without account'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(enterAsGuest).toHaveBeenCalled();
  });

  it('shows why guests cannot enter', async () => {
    enterAsGuest.mockRejectedValue(new Error('This site has no guest access'));
    renderWithTheme(<LoginForm />);

    fireEvent.click(screen.getByText('Continue without account'));

    await waitFor(() => {
      expect(screen.getByText('This site has no guest access')).toBeInTheDocument();
    });
  });

  it('does not offer guest access when the site has none', () => {
    signInOptions.mockReturnValue({ guest: false });
    renderWithTheme(<LoginForm />);
    expect(screen.queryByText('Continue without account')).not.toBeInTheDocument();
  });

  it('shows error for empty username', async () => {
    renderWithTheme(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows error for empty password', async () => {
    renderWithTheme(<LoginForm />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'testuser' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('signs in with the account and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    signIn.mockResolvedValue(undefined);
    const { container } = renderWithTheme(<LoginForm onSuccess={onSuccess} />);

    fillIn(container, 'testuser', 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(signIn).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('displays why the sign in failed', async () => {
    signIn.mockRejectedValue(new Error('Wrong user name or password'));
    const { container } = renderWithTheme(<LoginForm />);

    fillIn(container, 'testuser', 'wrongpassword');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Wrong user name or password')).toBeInTheDocument();
    });
  });
});

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LoginFormProps {
  onSuccess?: () => void;
  initialMode?: 'login' | 'register' | 'forgot-password';
}

type FormMode = 'login' | 'register' | 'forgot-password';

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'forgot-password') {
      if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
      try {
        const response = await fetch('/user/request-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        const responseText = await response.text();
        if (!response.ok) { setError(responseText || 'Password reset request failed'); }
        else { setSuccess(responseText); }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Password reset request failed');
      }
      setLoading(false);
      return;
    }

    if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
    if (!password) { setError('Password is required'); setLoading(false); return; }
    if (username.length > 64) { setError('Username is too long (max 64 characters)'); setLoading(false); return; }
    if (password.length > 64) { setError('Password is too long (max 64 characters)'); setLoading(false); return; }

    if (mode === 'register') {
      if (password !== passwordAgain) { setError('The passwords are not identical!'); setLoading(false); return; }
      if (!email.trim()) { setError('Email is required'); setLoading(false); return; }
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email)) { setError('Invalid email format'); setLoading(false); return; }
    }

    try {
      const endpoint = mode === 'login' ? '/user/login' : '/user/register';
      const body = mode === 'login' ? { username, password } : { username, password, email };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const responseText = await response.text();
      if (!response.ok) { setError(responseText || `${mode === 'login' ? 'Login' : 'Registration'} failed`); setLoading(false); return; }
      if (onSuccess) { onSuccess(); } else { window.location.reload(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${mode === 'login' ? 'Login' : 'Registration'} failed`);
      setLoading(false);
    }
  };

  const switchMode = (newMode: FormMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setUsername('');
    setPassword('');
    setPasswordAgain('');
    setEmail('');
  };

  const titles: Record<FormMode, string> = {
    'login': 'Login',
    'register': 'Register',
    'forgot-password': 'Forgot Password',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${theme.inputBorder}`,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: theme.gray700,
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.modalOverlay,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          backgroundColor: theme.modalBg,
          border: `1px solid ${theme.modalBorder}`,
          borderRadius: '12px',
          width: '400px',
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.25s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 24px',
            backgroundColor: theme.modalHeaderBg,
            borderBottom: `1px solid ${theme.modalBorder}`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme.gray900 }}>
            {titles[mode]}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Username */}
              <div>
                <label htmlFor={`${mode}-username`} style={labelStyle}>Username:</label>
                <input
                  type="text"
                  id={`${mode}-username`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
                />
              </div>

              {/* Password */}
              {mode !== 'forgot-password' && (
                <div>
                  <label htmlFor={`${mode}-password`} style={labelStyle}>Password:</label>
                  <input
                    type="password"
                    id={`${mode}-password`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
                  />
                </div>
              )}

              {/* Register-only fields */}
              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="register-password-again" style={labelStyle}>Retype Password:</label>
                    <input
                      type="password"
                      id="register-password-again"
                      value={passwordAgain}
                      onChange={(e) => setPasswordAgain(e.target.value)}
                      disabled={loading}
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
                    />
                  </div>
                  <div>
                    <label htmlFor="register-email" style={labelStyle}>Email:</label>
                    <input
                      type="email"
                      id="register-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="your@email.com"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Error / Success messages */}
            {error && (
              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: theme.alertPale,
                color: theme.alert,
                fontSize: '13px',
                fontWeight: 500,
                border: `1px solid ${theme.alertLight}`,
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: theme.successLight,
                color: theme.success,
                fontSize: '13px',
                fontWeight: 500,
                border: `1px solid ${theme.success}`,
              }}>
                {success}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: theme.buttonPrimaryBg,
                  color: theme.buttonPrimaryText,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = theme.buttonPrimaryHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.buttonPrimaryBg; }}
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : 'Request Reset'}
              </button>

              {mode === 'login' && (
                <>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    disabled={loading}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.buttonSecondaryBorder}`,
                      backgroundColor: theme.buttonSecondaryBg,
                      color: theme.buttonSecondaryText,
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
                  >
                    I have no account yet
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: theme.primary,
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.primaryHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = theme.primary)}
                  >
                    Forgot Password?
                  </button>
                </>
              )}

              {mode === 'register' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.buttonSecondaryBorder}`,
                    backgroundColor: theme.buttonSecondaryBg,
                    color: theme.buttonSecondaryText,
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
                >
                  I have already an account
                </button>
              )}

              {mode === 'forgot-password' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.buttonSecondaryBorder}`,
                    backgroundColor: theme.buttonSecondaryBg,
                    color: theme.buttonSecondaryText,
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
                >
                  Back to Login
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

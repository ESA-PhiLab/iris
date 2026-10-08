import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { chosenBackend } from '../services/backend';

interface LoginFormProps {
  onSuccess?: () => void;
}

/** Sign in with an account of credentials.json, or enter as a guest */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const source = chosenBackend();
  const options = source?.signInOptions() ?? { guest: false };

  const finish = () => {
    if (onSuccess) { onSuccess(); } else { window.location.reload(); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) { setError('Username is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (!source) { setError('The project is not loaded'); return; }
    setLoading(true);
    try {
      await source.signIn(username, password);
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const enterAsGuest = async () => {
    setError(null);
    if (!source) { setError('The project is not loaded'); return; }
    setLoading(true);
    try {
      await source.enterAsGuest();
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enter as guest');
      setLoading(false);
    }
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
            Login
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Username */}
              <div>
                <label htmlFor="login-username" style={labelStyle}>Username:</label>
                <input
                  type="text"
                  id="login-username"
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
              <div>
                <label htmlFor="login-password" style={labelStyle}>Password:</label>
                <input
                  type="password"
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
                />
              </div>
            </div>

            {/* Error */}
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
                {loading ? 'Please wait...' : 'Login'}
              </button>

              {options.guest && <button
                type="button"
                onClick={enterAsGuest}
                disabled={loading}
                title="Enter without an account: your masks stay in this browser"
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
                Continue without account
              </button>}
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

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SegmentationApp from './segmentation-app';

const chooseBackend = vi.fn();
const startSegmentation = vi.fn();
vi.mock('./segmentation/startup', () => ({
  chooseBackend: () => chooseBackend(),
  startSegmentation: () => startSegmentation(),
}));

// Mock ThemeContext to avoid matchMedia issues in test environment
vi.mock('./contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({
    theme: {
      bgPrimary: '#fff', bgSecondary: '#f5f5f5', bgTertiary: '#e5e5e5',
      gray100: '#f5f5f5', gray200: '#e5e5e5', gray300: '#d4d4d4', gray400: '#a3a3a3',
      gray500: '#737373', gray600: '#525252', gray700: '#404040', gray800: '#262626', gray900: '#171717',
      primary: '#007cba', primaryHover: '#006aa3', color: '#171717', colorPale: '#f5f5f5',
      modalBg: '#fff', modalBorder: '#e5e5e5', modalOverlay: 'rgba(0,0,0,0.5)',
      modalHeaderBg: '#f5f5f5', success: '#22c55e', successDark: '#16a34a', successLight: '#dcfce7',
      error: '#ef4444', errorDark: '#dc2626', errorLight: '#fee2e2', warning: '#f59e0b',
      warningDark: '#d97706', warningLight: '#fef3c7',
    },
    themeName: 'light' as const,
    setThemeName: () => {},
  }),
}));

/**
 * Mock the PreferencesModal component to avoid rendering the full modal in tests.
 * Instead, we render a simple div that we can query and check if it's open or closed.
 */
vi.mock('./components/PreferencesModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="preferences-modal" data-open={isOpen}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

/**
 * Mock the UserProfileModal component
 */
vi.mock('./components/UserProfileModal', () => ({
  UserProfileModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="user-profile-modal" data-open={isOpen}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

/**
 * Mock the LoginForm component
 */
vi.mock('./components/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

/**
 * Mock the HelpModal component
 */
vi.mock('./components/HelpModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="help-modal" data-open={isOpen}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('SegmentationApp - start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSegmentation.mockResolvedValue(undefined);
  });

  it('asks to sign in when nobody is signed in', async () => {
    chooseBackend.mockResolvedValue({ currentUser: async () => null, review: () => null });

    const { getByTestId } = render(<SegmentationApp />);

    await waitFor(() => expect(getByTestId('login-form')).toBeInTheDocument());
    expect(startSegmentation).not.toHaveBeenCalled();
  });

  it('opens the project for the user who is signed in', async () => {
    chooseBackend.mockResolvedValue({ currentUser: async () => ({ name: 'local' }), review: () => null });

    const { queryByTestId } = render(<SegmentationApp />);

    await waitFor(() => expect(startSegmentation).toHaveBeenCalled());
    expect(queryByTestId('login-form')).not.toBeInTheDocument();
  });

  it('says what is wrong when the page has no project', async () => {
    chooseBackend.mockRejectedValue(new Error('Could not read iris.json (404): IRIS needs it next to the page'));

    const { findByText } = render(<SegmentationApp />);

    expect(await findByText(/IRIS needs it next to the page/)).toBeInTheDocument();
    expect(startSegmentation).not.toHaveBeenCalled();
  });
});

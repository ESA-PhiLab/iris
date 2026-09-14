import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import SegmentationApp from './segmentation-app';

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

describe('SegmentationApp - URL Parameter Handling', () => {
  let originalLocation: Location;

  /**
   * beforeEach runs before each test in this describe block.
   * We use it to set up a clean test environment:
   * 1. Save the real window.location so we can restore it later
   * 2. Mock window.init_segmentation (legacy function the app expects)
   * 3. Mock window.vars (legacy global variable the app expects)
   */
  beforeEach(() => {
    originalLocation = window.location;
    (window as any).init_segmentation = vi.fn();
    (window as any).vars = {};
    
    // Mock fetch for authentication check - fix the URL to match what the app actually calls
    global.fetch = vi.fn((url) => {
      if (url === '/user/get/current') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: { id: 1, name: 'testuser', admin: false } })
        });
      }
      // Mock image list API call
      if (url.includes('/segmentation/api/images/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ images: [] })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as any;
  });

  /**
   * afterEach runs after each test in this describe block.
   * We use it to clean up and restore the original state:
   * 1. Restore the real window.location
   * 2. Remove the mocked functions/variables we added
   * This prevents tests from affecting each other.
   */
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    delete (window as any).init_segmentation;
    delete (window as any).vars;
    delete (window as any).openLogin;
    delete (window as any).openUserProfile;
    delete (window as any).irisReactApp;
    vi.restoreAllMocks();
  });

  it('opens preferences modal when openPreferences=true in URL', async () => {
    // Mock window.location to simulate arriving at /segmentation?openPreferences=true
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      search: '?openPreferences=true', // This is what we're testing
      pathname: '/segmentation',
      hostname: 'localhost',
    };

    // Render the component
    let getByTestId: any;
    await act(async () => {
      const result = render(<SegmentationApp />);
      getByTestId = result.getByTestId;
    });

    // Wait for the component to process the URL parameter and open the modal
    await waitFor(() => {
      const modal = getByTestId('preferences-modal');
      expect(modal).toHaveAttribute('data-open', 'true');
    }, { timeout: 3000 });
  });

  it('does not open preferences modal without URL parameter', async () => {
    // Mock window.location without the openPreferences parameter
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      search: '', // No URL parameters
      pathname: '/segmentation',
      hostname: 'localhost',
    };

    // Render the component
    let getByTestId: any;
    await act(async () => {
      const result = render(<SegmentationApp />);
      getByTestId = result.getByTestId;
    });

    // Verify the modal stays closed
    await waitFor(() => {
      const modal = getByTestId('preferences-modal');
      expect(modal).toHaveAttribute('data-open', 'false');
    });
  });

  it('exposes window.openLogin function for legacy JS', async () => {
    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      search: '',
      pathname: '/segmentation',
      hostname: 'localhost',
    };

    // Render the component
    let getByTestId: any;
    await act(async () => {
      const result = render(<SegmentationApp />);
      getByTestId = result.getByTestId;
    });

    // Wait for the component to initialize and expose the function
    await waitFor(() => {
      expect(window.openLogin).toBeDefined();
      expect(typeof window.openLogin).toBe('function');
    }, { timeout: 3000 });

    // Call the function and verify login form appears
    window.openLogin!();
    
    await waitFor(() => {
      const loginForm = getByTestId('login-form');
      expect(loginForm).toBeInTheDocument();
    });
  });

  it('exposes window.openUserProfile function for legacy JS', async () => {
    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      search: '',
      pathname: '/segmentation',
      hostname: 'localhost',
    };

    // Render the component
    let getByTestId: any;
    await act(async () => {
      const result = render(<SegmentationApp />);
      getByTestId = result.getByTestId;
    });

    // Wait for the component to initialize and expose the function
    await waitFor(() => {
      expect(window.openUserProfile).toBeDefined();
      expect(typeof window.openUserProfile).toBe('function');
    }, { timeout: 3000 });

    // Call the function and verify profile modal appears
    await act(async () => {
      window.openUserProfile!('test-user-123');
    });
    
    await waitFor(() => {
      const profileModal = getByTestId('user-profile-modal');
      expect(profileModal).toHaveAttribute('data-open', 'true');
    });
  });

  it('exposes window.irisReactApp.openHelpModal function for legacy JS', async () => {
    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      search: '',
      pathname: '/segmentation',
      hostname: 'localhost',
    };

    // Render the component
    let getByTestId: any;
    await act(async () => {
      const result = render(<SegmentationApp />);
      getByTestId = result.getByTestId;
    });

    // Wait for the component to initialize and expose the function
    await waitFor(() => {
      expect(window.irisReactApp).toBeDefined();
      expect(window.irisReactApp?.openHelpModal).toBeDefined();
      expect(typeof window.irisReactApp?.openHelpModal).toBe('function');
    }, { timeout: 3000 });

    // Call the function and verify help modal appears
    await act(async () => {
      window.irisReactApp!.openHelpModal!();
    });
    
    await waitFor(() => {
      const helpModal = getByTestId('help-modal');
      expect(helpModal).toHaveAttribute('data-open', 'true');
    });
  });
});

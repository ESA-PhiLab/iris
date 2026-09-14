import { useEffect } from 'react';

interface UseSegmentationSetupProps {
  authChecked: boolean;
  onOpenPreferences: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenProfile: (userId?: string) => void;
  onOpenHelp: () => void;
}

export const useSegmentationSetup = ({
  authChecked,
  onOpenPreferences,
  onOpenLogin,
  onOpenRegister,
  onOpenProfile,
  onOpenHelp
}: UseSegmentationSetupProps) => {
  useEffect(() => {
    if (!authChecked) return;

    // Check if window is available (not in SSR or test environment without proper setup)
    if (typeof window === 'undefined') return;

    const isDebugMode = window.location.search.includes('debug=1') || window.location.hostname === 'localhost';
    
    if (isDebugMode) {
      console.log('🚀 IRIS Segmentation: React SPA initialized');
    }
    
    // Check if we should auto-open preferences (from admin navigation)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openPreferences') === 'true') {
      onOpenPreferences();
      // Clean up URL parameter
      urlParams.delete('openPreferences');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }

    // Override global dialogue functions to use React modals
    if (typeof window !== 'undefined') {
      (window as any).dialogue_config = onOpenPreferences;
      (window as any).openUserProfile = onOpenProfile;
      (window as any).openLogin = onOpenLogin;
      (window as any).openRegister = onOpenRegister;

      // Expose logout function for React
      (window as any).reactLogout = async (callback?: () => void) => {
        await fetch('/user/logout');
        if (callback) {
          callback();
        } else {
          window.location.reload();
        }
      };

      // Expose React functions for legacy JavaScript integration
      (window as any).irisReactApp = {
        openHelpModal: onOpenHelp,
        openUserProfile: onOpenProfile,
        openPreferences: onOpenPreferences,
      };
    }

    // Note: Legacy init_segmentation() is no longer called here
    // React-first architecture handles initialization directly in segmentation-app.tsx
  }, [authChecked, onOpenPreferences, onOpenLogin, onOpenRegister, onOpenProfile, onOpenHelp]);
};

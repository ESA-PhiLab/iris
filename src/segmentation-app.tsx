import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import TopBar from './components/segmentation/TopBar';
import LeftToolbar from './components/segmentation/LeftToolbar';
import RightPanel from './components/segmentation/RightPanel';
import BottomBar from './components/segmentation/BottomBar';
import SegmentationModals from './components/segmentation/SegmentationModals';
import ViewerComparison from './components/segmentation/ViewerComparison';
import ImageChatPanel from './components/segmentation/ImageChatPanel';
import { useSegmentationSetup } from './components/segmentation/hooks/useSegmentationSetup';
import { useSegmentationStore } from './stores/segmentationStore';
import { useViewManagerStore } from './stores/viewManagerStore';
import { useConfigLoader } from './hooks/useConfigLoader';
import './utils/legacyBridge'; // Initialize legacy bridge functions

// Declare global functions that exist in the legacy JavaScript
declare global {
  interface Window {
    init_segmentation: () => void;
    vars: any;
    openUserProfile?: (userId?: string) => void;
    openLogin?: () => void;
    openRegister?: () => void;
    reactLogout?: (callback?: () => void) => Promise<void>;
    irisReactApp?: {
      openHelpModal?: () => void;
      openUserProfile?: (userId?: string) => void;
      openPreferences?: () => void;
    };
  }
}

const SegmentationApp: React.FC = () => {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string>('current');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isResetMaskOpen, setIsResetMaskOpen] = useState(false);
  const [isClassSelectionOpen, setIsClassSelectionOpen] = useState(false);
  const [isImageInfoOpen, setIsImageInfoOpen] = useState(false);
  const [isConfusionMatrixOpen, setIsConfusionMatrixOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  // Chat configuration from project config
  const config = useSegmentationStore((state) => state.config);
  const chatEnabled = config?.chat?.enabled || false;
  const githubRepo = config?.chat?.github_repo || '';
  const utterancesTheme = config?.chat?.utterances_theme || 'github-light';

  // Get config loader hook
  const { loadConfig } = useConfigLoader();

  // Note: Export GeoTIFF is now handled in TopBar component

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/user/get/current', {
          credentials: 'same-origin'
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          // Show login form if not authenticated
          setIsLoginOpen(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setIsLoginOpen(true);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Initialize app with clean React-first architecture
  useEffect(() => {
    const initializeApp = async () => {
      if (!authChecked || !isAuthenticated) return;

      try {
        const w = window as any;
        if (w.IRIS_DEBUG) console.log('🔧 React: Starting app initialization...');
        
        // Load config directly (no polling, no legacy dependency)
        await loadConfig();
        
        // Initialize navigation
        await initializeNavigation();
        
        // CRITICAL: Initialize views and mask data (equivalent to init_views)
        // This handles ViewManager creation, so no separate service needed
        await initializeMaskData();
        
        if (w.IRIS_DEBUG) console.log('✅ React: App initialization complete');
      } catch (error) {
        console.error('❌ React: App initialization failed:', error);
        // You can set error state here if needed
      }
    };

    initializeApp();
  }, [authChecked, isAuthenticated]); // Remove loadConfig from dependencies to prevent infinite loop

  // Initialize navigation store with image list
  const initializeNavigation = async () => {
    try {
      // Get current image ID from React store (primary source)
      const currentImageId = useSegmentationStore.getState().currentImageId;
      if (!currentImageId) {
        if ((window as any).IRIS_DEBUG) console.warn('No current image ID found in store, skipping navigation initialization');
        return;
      }

      const response = await fetch(
        `/segmentation/api/images/list?current_image_id=${encodeURIComponent(currentImageId)}`,
        { credentials: 'same-origin' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }

      const data = await response.json();

      // Set images in store
      useSegmentationStore.getState().setImages(data.images);

      // Set current image
      useSegmentationStore.getState().setCurrentImage(currentImageId);
      
      if ((window as any).IRIS_DEBUG) console.log('✅ React: Navigation initialized');
    } catch (error) {
      console.error('❌ React: Navigation initialization failed:', error);
    }
  };

  // Initialize mask data for current image (equivalent to legacy init_views)
  const initializeMaskData = async () => {
    try {
      // Get current image ID from React store (primary source)
      const currentImageId = useSegmentationStore.getState().currentImageId;
      if (!currentImageId) {
        if ((window as any).IRIS_DEBUG) console.warn('No current image ID found in store, skipping mask data initialization');
        return;
      }

      const w = window as any;
      if (w.IRIS_DEBUG) console.log('🔧 React: Initializing views and mask data for image:', currentImageId);
      
      // CRITICAL: Wait for legacy scripts to be fully loaded
      if (!w.legacyScriptsReady) {
        if (w.IRIS_DEBUG) console.log('⏳ React: Waiting for legacy scripts to be ready...');
        const maxWait = 5000; // 5 seconds
        const startTime = Date.now();
        while (!w.legacyScriptsReady) {
          if (Date.now() - startTime > maxWait) {
            console.error('❌ React: Legacy scripts not ready after 5 seconds');
            throw new Error('Legacy scripts failed to load');
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (w.IRIS_DEBUG) console.log('✅ React: Legacy scripts ready');
      }
      
      // Call the full init_views function which handles:
      // - Hidden mask canvas creation
      // - Mask data loading
      // - Toolbar/statusbar visibility
      // - Event initialization
      if (w.init_views) {
        await w.init_views();
        if (w.IRIS_DEBUG) console.log('✅ React: Views and mask data initialized successfully');
        
        // CRITICAL: Wait for ViewManager instance to be set in store
        // This prevents "FALLBACK: Using legacy render_views" warning
        const maxWait = 1000; // 1 second
        const startTime = Date.now();
        while (!useViewManagerStore.getState().legacyViewManagerInstance) {
          if (Date.now() - startTime > maxWait) {
            if (w.IRIS_DEBUG) console.warn('⚠️ React: ViewManager instance not set after 1 second');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        if (useViewManagerStore.getState().legacyViewManagerInstance && w.IRIS_DEBUG) {
          console.log('✅ React: ViewManager instance confirmed in store');
        }
        
        // CRITICAL: Set the image in viewManagerStore after init_views completes
        const imageLocation = useViewManagerStore.getState().imageLocation || [0, 0];
        useViewManagerStore.getState().setImage(currentImageId, imageLocation);
        if (w.IRIS_DEBUG) console.log('✅ React: Image set in viewManagerStore:', currentImageId);
        
        // Verify critical components are available from store (debug only)
        if (w.IRIS_DEBUG) {
          const maskData = w.getMaskDataFromStore ? w.getMaskDataFromStore() : null;
          const userMaskData = w.getUserMaskDataFromStore ? w.getUserMaskDataFromStore() : null;
          const hiddenMaskContext = w.getHiddenMaskContextFromStore ? w.getHiddenMaskContextFromStore() : null;
          
          if (hiddenMaskContext && maskData && userMaskData) {
            console.log('✅ React: All mask components verified from store:', {
              hasHiddenMaskContext: !!hiddenMaskContext,
              maskLength: maskData.length,
              userMaskLength: userMaskData.length,
              maskShape: w.getMaskShapeFromStore ? w.getMaskShapeFromStore() : null
            });
          } else {
            console.warn('⚠️ React: Some mask components missing after init_views', {
              hasHiddenMaskContext: !!hiddenMaskContext,
              hasMaskData: !!maskData,
              hasUserMaskData: !!userMaskData
            });
          }
        }
      } else {
        console.error('❌ React: init_views function not available');
      }
    } catch (error) {
      console.error('❌ React: Views and mask data initialization failed:', error);
    }
  };

  // Sync Zustand store with DOM (mask layer visibility)
  // This updates the canvas layers when store changes
  useEffect(() => {
    const unsubscribe = useSegmentationStore.subscribe(
      (state) => {
        const showMask = state.showMask;
        const w = window as any;
        
        // Update DOM directly (mask layer visibility)
        // This replicates the behavior of legacy show_mask() function
        const viewManager = w.getViewManagerFromStore ? w.getViewManagerFromStore() : null;
        if (viewManager) {
          const displayState = showMask ? "block" : "none";
          try {
            const maskLayers = viewManager.getLayers("mask");
            for (let layer of maskLayers) {
              if (layer.container) {
                layer.container.style.display = displayState;
              }
            }
          } catch (error) {
            // Silently handle - ViewManager may not be initialized yet
          }
        }
      }
    );
    
    return unsubscribe;
  }, []);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleOpenPreferences = useCallback(() => setIsPreferencesOpen(true), []);
  const handleOpenHelp = useCallback(() => setIsHelpOpen(true), []);
  const handleSelectClass = useCallback(() => setIsClassSelectionOpen(true), []);
  const handleResetMask = useCallback(() => setIsResetMaskOpen(true), []);
  const handleOpenProfile = useCallback(() => setIsProfileOpen(true), []);
  const handleOpenImageInfo = useCallback(() => setIsImageInfoOpen(true), []);
  const handleOpenConfusionMatrix = useCallback(() => setIsConfusionMatrixOpen(true), []);

  const handleOpenLogin = useCallback(() => {
    const w = window as any;
    if (w.hide_loader) w.hide_loader();
    setLoginMode('login');
    setIsLoginOpen(true);
  }, []);

  const handleOpenRegister = useCallback(() => {
    const w = window as any;
    if (w.hide_loader) w.hide_loader();
    setLoginMode('register');
    setIsLoginOpen(true);
  }, []);

  const handleOpenProfileWithId = useCallback((userId?: string) => {
    setProfileUserId(userId || 'current');
    setIsProfileOpen(true);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setIsLoginOpen(false);
    // Reload the page to reinitialize everything with authenticated state
    window.location.reload();
  }, []);

  // Setup segmentation with custom hook
  useSegmentationSetup({
    authChecked: authChecked && isAuthenticated,
    onOpenPreferences: handleOpenPreferences,
    onOpenLogin: handleOpenLogin,
    onOpenRegister: handleOpenRegister,
    onOpenProfile: handleOpenProfileWithId,
    onOpenHelp: handleOpenHelp
  });

  // Override legacy dialogue functions to use React modals
  useEffect(() => {
    (window as any).dialogue_reset_mask = () => setIsResetMaskOpen(true);
    (window as any).dialogue_class_selection = () => setIsClassSelectionOpen(true);
    (window as any).dialogue_image = () => setIsImageInfoOpen(true);
    (window as any).dialogue_confusion_matrix = () => setIsConfusionMatrixOpen(true);
  }, []);

  return (
    <ThemeProvider>
      <div style={{ height: '100vh', overflow: 'hidden' }}>
        {/* Top Bar */}
        <TopBar
        onOpenPreferences={handleOpenPreferences}
        onOpenHelp={handleOpenHelp}
        onOpenProfile={handleOpenProfile}
      />

      {/* Left Toolbar */}
      <LeftToolbar onResetMask={handleResetMask} />

      {/* Main Canvas Area */}
      <div
        style={{
          position: 'fixed',
          left: '60px',
          right: isRightPanelCollapsed ? '0' : '280px',
          top: '50px',
          bottom: '60px',
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          transition: 'right 0.3s ease',
        }}
      >
        <ViewerComparison />
      </div>

      {/* Right Panel */}
      <RightPanel 
        onSelectClass={handleSelectClass}
        isCollapsed={isRightPanelCollapsed}
        onToggleCollapse={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
      />

      {/* Bottom Bar */}
      <BottomBar
        onOpenImageInfo={handleOpenImageInfo}
        onOpenConfusionMatrix={handleOpenConfusionMatrix}
      />

      {/* Chat toggle button - only show if chat is enabled */}
      {chatEnabled && githubRepo && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{
            position: 'fixed',
            right: isChatOpen ? '420px' : '20px',
            bottom: '80px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#007cba',
            color: 'white',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 999,
            transition: 'right 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isChatOpen ? 'Close chat' : 'Open chat'}
        >
          💬
        </button>
      )}

      {/* Chat side panel */}
      {chatEnabled && githubRepo && (
        <ImageChatPanel 
          githubRepo={githubRepo}
          theme={utterancesTheme}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      <SegmentationModals
        isPreferencesOpen={isPreferencesOpen}
        onClosePreferences={() => setIsPreferencesOpen(false)}
        isProfileOpen={isProfileOpen}
        onCloseProfile={() => setIsProfileOpen(false)}
        profileUserId={profileUserId}
        isLoginOpen={isLoginOpen}
        loginMode={loginMode}
        onLoginSuccess={handleLoginSuccess}
        isHelpOpen={isHelpOpen}
        onCloseHelp={() => setIsHelpOpen(false)}
        isResetMaskOpen={isResetMaskOpen}
        onCloseResetMask={() => setIsResetMaskOpen(false)}
        onConfirmResetMask={() => {
          const w = window as any;
          if (w.reset_mask) w.reset_mask();
        }}
        isClassSelectionOpen={isClassSelectionOpen}
        onCloseClassSelection={() => setIsClassSelectionOpen(false)}
        isImageInfoOpen={isImageInfoOpen}
        onCloseImageInfo={() => setIsImageInfoOpen(false)}
        isConfusionMatrixOpen={isConfusionMatrixOpen}
        onCloseConfusionMatrix={() => setIsConfusionMatrixOpen(false)}
      />

      {/* React Development Indicator */}
      {(window.location.search.includes('debug=1') || window.location.hostname === 'localhost') && (
        <div style={{
          position: 'fixed',
          bottom: '0',
          right: '0',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '4px 8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 9999,
          borderTopLeftRadius: '4px',
          opacity: 0.8,
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          ⚛️ React SPA v{React.version}
        </div>
      )}
    </div>
    </ThemeProvider>
  );
};

// Initialize React when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    const container = document.getElementById('react-segmentation-app');
    if (container) {
      const root = createRoot(container);
      root.render(<SegmentationApp />);
    } else {
      console.error('❌ React mount container not found! Looking for #react-segmentation-app');
    }
  } catch (error) {
    console.error('❌ Failed to mount React Segmentation App:', error);
  }
});

export default SegmentationApp;
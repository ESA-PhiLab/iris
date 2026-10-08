import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.css';
import './styles/dialogue.css';
import './styles/segmentation.css';
import { ThemeProvider } from './contexts/ThemeContext';
import TopBar from './components/segmentation/TopBar';
import LeftToolbar from './components/segmentation/LeftToolbar';
import RightPanel from './components/segmentation/RightPanel';
import { sidebarWidth, useSidebars } from './components/segmentation/Sidebar';
import BottomBar from './components/segmentation/BottomBar';
import SegmentationModals from './components/segmentation/SegmentationModals';
import ViewerComparison from './components/segmentation/ViewerComparison';
import ImageNotesDialog from './components/segmentation/ImageNotesDialog';
import StatusLayer from './components/segmentation/StatusLayer';
import ReviewModal from './components/ReviewModal';
import TooltipLayer from './components/TooltipLayer';
import { useSegmentationStore } from './stores/segmentationStore';
import { useViewManagerStore } from './stores/viewManagerStore';
import { useUiStore } from './stores/uiStore';
import { useShortcut } from './hooks/useShortcut';
import { useEditorShortcuts } from './hooks/useEditorShortcuts';
import { chooseBackend, startSegmentation } from './segmentation/startup';
import { backend } from './services/backend';

const HELP_SHOWN_KEY = 'iris-help-shown';

const SegmentationApp: React.FC = () => {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isResetMaskOpen, setIsResetMaskOpen] = useState(false);
  const [isClassSelectionOpen, setIsClassSelectionOpen] = useState(false);
  const [isImageInfoOpen, setIsImageInfoOpen] = useState(false);
  const [isConfusionMatrixOpen, setIsConfusionMatrixOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { leftExpanded, rightExpanded, toggleLeft, toggleRight } = useSidebars();

  // Find where the project is, then sign in unless the session is still open
  useEffect(() => {
    chooseBackend()
      .then(async (source) => {
        const user = await source.currentUser();
        setIsAuthenticated(!!user);
        setCanReview(!!source.review?.());
        if (!user) setIsLoginOpen(true);
      })
      .catch(() => setIsLoginOpen(true));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    startSegmentation()
      .then(() => {
        // Show the help once to people who have not saved a mask yet
        const { user } = useSegmentationStore.getState();
        if (user?.segmentation?.n_masks !== 0) return;
        try {
          if (localStorage.getItem(HELP_SHOWN_KEY)) return;
          localStorage.setItem(HELP_SHOWN_KEY, 'true');
        } catch { /* ignore */ }
        setIsHelpOpen(true);
      })
      .catch((error: Error) => {
        console.error('Could not start the segmentation:', error);
        useUiStore.getState().showErrorModal(error.message, 'Could not open the image');
      })
      .finally(() => useViewManagerStore.getState().setInitialized(true));
  }, [isAuthenticated]);

  // Preferences opened from the admin pages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openPreferences') !== 'true') return;
    setIsPreferencesOpen(true);
    params.delete('openPreferences');
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
  }, []);

  // Keep unsaved changes when the page closes
  useEffect(() => {
    const onPageHide = () => {
      const { maskChanged, currentImageId, maskData, userMaskData } = useSegmentationStore.getState();
      if (maskChanged && currentImageId && maskData && userMaskData) {
        backend().saveMaskOnUnload(currentImageId, { mask: maskData, userMask: userMaskData });
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  const handleOpenPreferences = useCallback(() => setIsPreferencesOpen(true), []);
  const handleOpenHelp = useCallback(() => setIsHelpOpen(true), []);
  const handleSelectClass = useCallback(() => setIsClassSelectionOpen(true), []);
  const handleResetMask = useCallback(() => setIsResetMaskOpen(true), []);
  const handleOpenProfile = useCallback(() => setIsProfileOpen(true), []);
  const handleOpenImageInfo = useCallback(() => setIsImageInfoOpen(true), []);
  const handleOpenConfusionMatrix = useCallback(() => setIsConfusionMatrixOpen(true), []);

  const handleLoginSuccess = useCallback(() => {
    // Start again with the session of the user
    window.location.reload();
  }, []);

  // Shortcuts of the dialogs and the side panel (see utils/shortcuts.ts)
  useShortcut('classDialog', () => setIsClassSelectionOpen(true));
  useShortcut('imageInfo', () => setIsImageInfoOpen((open) => !open));
  useShortcut('stats', () => setIsConfusionMatrixOpen((open) => !open));
  useShortcut('profile', () => setIsProfileOpen((open) => !open));
  useShortcut('settings', () => setIsPreferencesOpen((open) => !open));
  useShortcut('help', () => setIsHelpOpen((open) => !open));
  useShortcut('review', () => { if (canReview) setIsReviewOpen((open) => !open); });
  useShortcut('leftToolbar', toggleLeft);
  useShortcut('rightPanel', toggleRight);
  useEditorShortcuts({ onResetMask: handleResetMask });

  return (
    <ThemeProvider>
      <div style={{ height: '100vh', overflow: 'hidden' }}>
        <TopBar
          onOpenPreferences={handleOpenPreferences}
          onOpenHelp={handleOpenHelp}
          onOpenProfile={handleOpenProfile}
        />

        <LeftToolbar expanded={leftExpanded} onToggle={toggleLeft} onResetMask={handleResetMask} />

        {/* The views, between the two columns */}
        <div
          style={{
            position: 'fixed',
            left: `${sidebarWidth(leftExpanded)}px`,
            right: `${sidebarWidth(rightExpanded)}px`,
            top: '50px',
            bottom: '60px',
            overflow: 'auto',
            backgroundColor: 'var(--color-bg-canvas)',
          }}
        >
          <ViewerComparison />
        </div>

        <RightPanel
          expanded={rightExpanded}
          onToggle={toggleRight}
          onSelectClass={handleSelectClass}
        />

        <BottomBar
          onOpenImageInfo={handleOpenImageInfo}
          onOpenConfusionMatrix={handleOpenConfusionMatrix}
          onOpenReview={canReview ? () => setIsReviewOpen(true) : undefined}
        />

        <TooltipLayer />
        <StatusLayer />
        <ImageNotesDialog />
        {canReview && <ReviewModal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} />}

        <SegmentationModals
          isPreferencesOpen={isPreferencesOpen}
          onClosePreferences={() => setIsPreferencesOpen(false)}
          isProfileOpen={isProfileOpen}
          onCloseProfile={() => setIsProfileOpen(false)}
          profileUserId="current"
          isLoginOpen={isLoginOpen}
          loginMode="login"
          onLoginSuccess={handleLoginSuccess}
          isHelpOpen={isHelpOpen}
          onCloseHelp={() => setIsHelpOpen(false)}
          isResetMaskOpen={isResetMaskOpen}
          onCloseResetMask={() => setIsResetMaskOpen(false)}
          onConfirmResetMask={() => useSegmentationStore.getState().resetMask()}
          isClassSelectionOpen={isClassSelectionOpen}
          onCloseClassSelection={() => setIsClassSelectionOpen(false)}
          isImageInfoOpen={isImageInfoOpen}
          onCloseImageInfo={() => setIsImageInfoOpen(false)}
          isConfusionMatrixOpen={isConfusionMatrixOpen}
          onCloseConfusionMatrix={() => setIsConfusionMatrixOpen(false)}
        />
      </div>
    </ThemeProvider>
  );
};

// Initialize React when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('react-segmentation-app');
  if (container) {
    createRoot(container).render(<SegmentationApp />);
  } else {
    console.error('React mount container not found! Looking for #react-segmentation-app');
  }
});

export default SegmentationApp;

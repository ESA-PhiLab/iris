import React, { useState, useEffect, useCallback } from 'react';
import { UserConfig, UserConfigApiResponse, AIModelConfig } from '../types/iris';
import SegmentationAITab from './preferences/SegmentationAITab';
import ViewsTab from './preferences/ViewsTab';
import ProjectConfigTab from './preferences/ProjectConfigTab';
import { useTheme } from '../contexts/ThemeContext';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfigTabState {
  hasUnsavedChanges: boolean;
}

/**
 * Error boundary for the preferences modal
 */
class PreferencesErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PreferencesModal error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            backgroundColor: '#FEF0F0', color: '#F08A8A',
            fontSize: '13px', border: '1px solid #F9C5C5',
          }}>
            An error occurred while loading preferences. Please refresh the page.
          </div>
          {this.state.error && (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main Preferences Modal Component
 * 
 * Provides a tabbed interface for configuring:
 * - Project Configuration (admin only)
 * - Segmentation AI settings (model parameters, inputs, postprocessing)
 * - Views configuration (not yet implemented)
 */
const PreferencesModalContent: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<UserConfig | null>(null);
  const [allBands, setAllBands] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'configuration' | 'segmentation-ai' | 'views'>('segmentation-ai');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState<boolean>(false);
  const [configTabState, setConfigTabState] = useState<ConfigTabState>({ hasUnsavedChanges: false });

  const { theme } = useTheme();

  const hasUnsavedChanges = useCallback(() => {
    if (activeTab === 'configuration' && configTabState.hasUnsavedChanges) return true;
    if (!config || !originalConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  }, [config, originalConfig, activeTab, configTabState]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const forceClose = useCallback(() => {
    setShowUnsavedWarning(false);
    onClose();
  }, [onClose]);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/segmentation/api/user-config');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: UserConfigApiResponse = await response.json();
      setConfig(data.config);
      setOriginalConfig(JSON.parse(JSON.stringify(data.config)));
      setAllBands(data.all_bands);
      const isAdminUser = data.is_admin || false;
      setIsAdmin(isAdminUser);
      if (isAdminUser) setActiveTab('configuration');
    } catch (error) {
      console.error('Error fetching config:', error);
      setError('Failed to load preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchConfig();
  }, [isOpen, fetchConfig]);

  useEffect(() => {
    if (isOpen) {
      const originalKeyDownHandler = document.body.onkeydown;
      const originalKeyUpHandler = document.body.onkeyup;
      document.body.onkeydown = (event: KeyboardEvent) => {
        if (event.code === 'Escape') {
          handleClose();
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      };
      document.body.onkeyup = null;
      return () => {
        document.body.onkeydown = originalKeyDownHandler;
        document.body.onkeyup = originalKeyUpHandler;
      };
    }
  }, [isOpen, handleClose]);

  const saveConfig = useCallback(async () => {
    if (!config) return;
    if (config.segmentation.ai_model.bands.length === 0) {
      setError('[Segmentation] Need at least one band as input!');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/segmentation/api/user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      onClose();
    } catch (error) {
      console.error('Error saving config:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [config, onClose]);

  const updateAIModelConfig = useCallback(
    (key: keyof AIModelConfig, value: any) => {
      if (!config) return;
      setConfig({
        ...config,
        segmentation: {
          ...config.segmentation,
          ai_model: { ...config.segmentation.ai_model, [key]: value },
        },
      });
    },
    [config]
  );

  const moveBands = useCallback(
    (from: 'included' | 'excluded', selectedBands: string[]) => {
      if (!config) return;
      const currentBands = config.segmentation.ai_model.bands;
      const newBands = from === 'excluded'
        ? [...currentBands, ...selectedBands]
        : currentBands.filter((band) => !selectedBands.includes(band));
      updateAIModelConfig('bands', newBands);
    },
    [config, updateAIModelConfig]
  );

  if (!isOpen) return null;

  const tabs: { key: typeof activeTab; label: string; adminOnly?: boolean }[] = [
    { key: 'configuration', label: 'Configuration', adminOnly: true },
    { key: 'segmentation-ai', label: 'Segmentation AI' },
    { key: 'views', label: 'Views' },
  ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      data-testid="preferences-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.modalOverlay, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        backgroundColor: theme.modalBg, border: `1px solid ${theme.modalBorder}`,
        borderRadius: '12px', width: '720px', maxWidth: '90vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'slideUp 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', backgroundColor: theme.modalHeaderBg,
          borderBottom: `1px solid ${theme.modalBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: theme.gray900, letterSpacing: '-0.01em' }}>
              Preferences
            </span>
          </div>
          <button onClick={handleClose} aria-label="Close modal" style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.gray500,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.bgTertiary; e.currentTarget.style.color = theme.gray900; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.gray500; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', gap: '0', borderBottom: `1px solid ${theme.modalBorder}`,
          backgroundColor: theme.modalHeaderBg, padding: '0 20px',
        }}>
          {tabs.filter(t => !t.adminOnly || isAdmin).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                data-testid={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px', fontSize: '13px', fontWeight: isActive ? 600 : 500,
                  color: isActive ? theme.primary : theme.gray600,
                  backgroundColor: 'transparent', border: 'none',
                  borderBottom: isActive ? `2px solid ${theme.primary}` : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  marginBottom: '-1px',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = theme.gray900; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = theme.gray600; }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.gray500, fontSize: '13px' }}>
              Loading preferences...
            </div>
          ) : config ? (
            <>
              {/* Unsaved Changes Warning */}
              {showUnsavedWarning && (
                <div style={{
                  padding: '14px', marginBottom: '16px', borderRadius: '8px',
                  backgroundColor: theme.alertPale, border: `1px solid ${theme.alertLight}`,
                }}>
                  <div style={{ fontWeight: 600, color: theme.gray900, marginBottom: '6px', fontSize: '14px' }}>
                    You have unsaved changes!
                  </div>
                  <div style={{ color: theme.gray700, fontSize: '13px', marginBottom: '12px' }}>
                    Are you sure you want to close without saving?
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={forceClose}
                      data-testid="discard-changes-button"
                      style={{
                        padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '13px',
                        fontWeight: 500, cursor: 'pointer',
                        backgroundColor: theme.buttonDangerBg, color: theme.buttonDangerText,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonDangerHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonDangerBg)}
                    >
                      Discard Changes
                    </button>
                    <button
                      onClick={() => setShowUnsavedWarning(false)}
                      data-testid="cancel-close-button"
                      style={{
                        padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', border: `1px solid ${theme.buttonSecondaryBorder}`,
                        backgroundColor: theme.buttonSecondaryBg, color: theme.buttonSecondaryText,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div data-testid="preferences-error-message" style={{
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                  backgroundColor: theme.alertPale, color: theme.alert,
                  fontSize: '13px', fontWeight: 500, border: `1px solid ${theme.alertLight}`,
                }}>
                  {error}
                </div>
              )}

              {/* Tab Content */}
              {activeTab === 'configuration' && isAdmin && (
                <ProjectConfigTab onStateChange={setConfigTabState} />
              )}
              {activeTab === 'segmentation-ai' && (
                <SegmentationAITab
                  config={config}
                  allBands={allBands}
                  updateAIModelConfig={updateAIModelConfig}
                  moveBands={moveBands}
                />
              )}
              {activeTab === 'views' && <ViewsTab />}

              {/* Action Buttons */}
              {activeTab !== 'configuration' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={saveConfig}
                    disabled={isLoading || isSaving}
                    data-testid="save-preferences-button"
                    style={{
                      padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '13px',
                      fontWeight: 600, cursor: (isLoading || isSaving) ? 'not-allowed' : 'pointer',
                      backgroundColor: theme.buttonPrimaryBg, color: theme.buttonPrimaryText,
                      opacity: (isLoading || isSaving) ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isLoading && !isSaving) e.currentTarget.style.backgroundColor = theme.buttonPrimaryHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.buttonPrimaryBg; }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={isSaving}
                    data-testid="close-preferences-button"
                    style={{
                      padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      border: `1px solid ${theme.buttonSecondaryBorder}`,
                      backgroundColor: theme.buttonSecondaryBg, color: theme.buttonSecondaryText,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
                  >
                    Close
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div style={{
                padding: '10px 14px', borderRadius: '8px', display: 'inline-block',
                backgroundColor: theme.alertPale, color: theme.alert,
                fontSize: '13px', border: `1px solid ${theme.alertLight}`,
              }}>
                Failed to load preferences
              </div>
              <div style={{ marginTop: '12px' }}>
                <button onClick={fetchConfig} style={{
                  padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.buttonSecondaryBorder}`,
                  backgroundColor: theme.buttonSecondaryBg, color: theme.buttonSecondaryText,
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

/**
 * Main PreferencesModal component wrapped with error boundary
 */
const PreferencesModal: React.FC<PreferencesModalProps> = (props) => {
  return (
    <PreferencesErrorBoundary>
      <PreferencesModalContent {...props} />
    </PreferencesErrorBoundary>
  );
};

export default PreferencesModal;

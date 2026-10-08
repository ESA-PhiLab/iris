import React, { useEffect, useState } from 'react';
import { useSegmentationStore } from '../stores/segmentationStore';
import { Profile, backend } from '../services/backend';
import { downloadFile } from '../utils/download';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeName } from '../themes/colorschemes';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState(true);
  const { theme, themeName, setTheme } = useTheme();

  useEffect(() => {
    if (!isOpen) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        setProfile(await backend().loadProfile());
      } catch (err) {
        setError(`Failed to load profile: ${err instanceof Error ? err.message : err}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.code === 'Escape') { onClose(); event.preventDefault(); event.stopPropagation(); }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const [downloading, setDownloading] = useState(false);
  const handleDownloadMasks = async () => {
    setDownloading(true);
    try {
      const file = await backend().downloadMasks();
      if (file) downloadFile(file.bytes, file.name, 'application/zip');
      else setError('You have not saved any mask yet');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the masks');
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await backend().signOut();
      window.location.reload();
    } catch { setError('Failed to logout'); }
  };

  const handleThemeChange = (newTheme: ThemeName) => { setTheme(newTheme); };

  const handleImageClick = (imageId: string) => {
    // Keep the mask being edited, then open the image in a new tab
    const { maskChanged, saveCurrentMask } = useSegmentationStore.getState();
    if (maskChanged) saveCurrentMask().catch(() => {});
    window.open(backend().pageUrl(imageId));
    onClose();
  };

  if (!isOpen) return null;

  // Shared styles
  const sectionStyle: React.CSSProperties = {
    padding: '16px', borderRadius: '8px', border: `1px solid ${theme.modalBorder}`,
    backgroundColor: theme.bgSecondary, marginTop: '16px',
  };
  const tagStyle = (color: string, bg: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: '10px',
    fontSize: '11px', fontWeight: 600, color, backgroundColor: bg, marginRight: '6px',
  });

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.modalOverlay, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        backgroundColor: theme.modalBg, border: `1px solid ${theme.modalBorder}`,
        borderRadius: '12px', width: '560px', maxWidth: '90vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'slideUp 0.25s ease', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', backgroundColor: theme.modalHeaderBg,
          borderBottom: `1px solid ${theme.modalBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: theme.gray900, letterSpacing: '-0.01em' }}>
              User information
            </span>
          </div>
          <button onClick={onClose} aria-label="Close modal" style={{
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

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '30px', color: theme.gray500, fontSize: '13px' }}>
              Loading profile...
            </div>
          )}

          {error && !profile && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', backgroundColor: theme.alertPale,
              color: theme.alert, fontSize: '13px', border: `1px solid ${theme.alertLight}`,
            }}>
              {error}
            </div>
          )}

          {profile && (
            <>
              {/* User name + tags */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: theme.gray900 }}>{profile.name}</span>
                <div>
                  {profile.is_current_user && (
                    <span style={tagStyle(theme.bgPrimary, theme.primary)}>this is you</span>
                  )}
                  {profile.admin && (
                    <span style={tagStyle(theme.bgPrimary, theme.success)}>admin</span>
                  )}
                  {profile.tested ? (
                    <span style={tagStyle(theme.bgPrimary, theme.success)}>tested</span>
                  ) : (
                    <span style={tagStyle(theme.bgPrimary, theme.alert)}>not tested</span>
                  )}
                </div>
              </div>

              {/* Segmentation accordion */}
              <div
                onClick={() => setAccordionOpen(!accordionOpen)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                  backgroundColor: theme.bgTertiary, border: `1px solid ${theme.modalBorder}`,
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: theme.gray900 }}>Segmentation</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: accordionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {accordionOpen && (
                <div style={{ marginTop: '12px' }}>
                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { label: 'Rank', value: profile.segmentation.rank ?? 'N/A' },
                      { label: 'Score', value: profile.segmentation.score },
                      { label: 'Unverified score', value: profile.segmentation.score_unverified },
                      { label: 'Labelled images', value: profile.segmentation.n_masks },
                    ].map((stat) => (
                      <div key={stat.label} style={{
                        padding: '10px 14px', borderRadius: '8px',
                        backgroundColor: theme.bgSecondary, border: `1px solid ${theme.modalBorder}`,
                      }}>
                        <div style={{ fontSize: '11px', color: theme.gray500, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                          {stat.label}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: theme.gray900 }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Last masks table */}
                  {profile.segmentation.last_masks && profile.segmentation.last_masks.length > 0 && (
                    <>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: theme.gray700, marginBottom: '8px' }}>
                        Last segmentation masks
                      </div>
                      <div style={{ borderRadius: '8px', border: `1px solid ${theme.modalBorder}`, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr>
                              {['Image', 'Score', 'Last modification', 'Time spent'].map((h) => (
                                <th key={h} style={{
                                  padding: '8px 12px', textAlign: 'left', backgroundColor: theme.modalHeaderBg,
                                  color: theme.gray600, fontWeight: 600, fontSize: '11px',
                                  textTransform: 'uppercase', letterSpacing: '0.05em',
                                  borderBottom: `1px solid ${theme.modalBorder}`,
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {profile.segmentation.last_masks.map((mask, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '8px 12px', borderBottom: idx < profile.segmentation.last_masks!.length - 1 ? `1px solid ${theme.modalBorder}` : 'none' }}>
                                  <button onClick={() => handleImageClick(mask.image_id)} style={{
                                    background: 'none', border: 'none', color: theme.primary,
                                    cursor: 'pointer', fontWeight: 500, fontSize: '13px', padding: 0,
                                  }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >{mask.image_id}</button>
                                </td>
                                <td style={{ padding: '8px 12px', color: theme.gray900, borderBottom: idx < profile.segmentation.last_masks!.length - 1 ? `1px solid ${theme.modalBorder}` : 'none' }}>
                                  {mask.score}
                                  {mask.score_unverified && (
                                    <span style={{ ...tagStyle(theme.gray600, theme.bgTertiary), marginLeft: '6px' }}>unverified</span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 12px', color: theme.gray600, borderBottom: idx < profile.segmentation.last_masks!.length - 1 ? `1px solid ${theme.modalBorder}` : 'none' }}>
                                  {mask.last_modification}
                                </td>
                                <td style={{ padding: '8px 12px', color: theme.gray600, borderBottom: idx < profile.segmentation.last_masks!.length - 1 ? `1px solid ${theme.modalBorder}` : 'none' }}>
                                  {mask.time_spent}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {profile.is_current_user && (
                <>
                  {/* Theme selector */}
                  <div style={sectionStyle}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: theme.gray900, marginBottom: '12px' }}>Appearance</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {([
                        { value: 'light' as ThemeName, label: '☀️ Light', sub: 'Sunset' },
                        { value: 'dark' as ThemeName, label: '🌙 Dark', sub: 'Midnight' },
                        { value: 'system' as ThemeName, label: '💻 System', sub: 'Auto' },
                      ]).map((opt) => {
                        const isActive = themeName === opt.value;
                        return (
                          <button key={opt.value} onClick={() => handleThemeChange(opt.value)} style={{
                            flex: 1, padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
                            border: isActive ? `2px solid ${theme.primary}` : `1px solid ${theme.modalBorder}`,
                            backgroundColor: isActive ? theme.primaryPale : 'transparent',
                            textAlign: 'center',
                          }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = theme.bgTertiary; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ fontSize: '14px', marginBottom: '2px', color: theme.gray900 }}>{opt.label}</div>
                            <div style={{ fontSize: '11px', color: theme.gray500 }}>{opt.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.gray500, marginTop: '10px' }}>
                      {themeName === 'system'
                        ? 'Theme will match your operating system preference'
                        : `Using ${themeName === 'light' ? 'Light (Sunset)' : 'Dark (Midnight)'} theme`}
                    </div>
                  </div>

                  {/* Actions: Download masks / Logout */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button onClick={handleDownloadMasks} disabled={downloading} style={{
                      padding: '10px 16px', borderRadius: '8px',
                      border: `1px solid ${theme.buttonSecondaryBorder}`,
                      backgroundColor: theme.buttonSecondaryBg, color: theme.buttonSecondaryText,
                      fontSize: '13px', fontWeight: 500, cursor: downloading ? 'wait' : 'pointer',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
                    >{downloading ? 'Preparing...' : 'Download my masks'}</button>
                    {profile.canSignOut && <button onClick={handleLogout} style={{
                      padding: '10px 16px', borderRadius: '8px', border: 'none',
                      backgroundColor: theme.buttonDangerBg, color: theme.buttonDangerText,
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonDangerHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonDangerBg)}
                    >Logout</button>}
                  </div>
                </>
              )}
            </>
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

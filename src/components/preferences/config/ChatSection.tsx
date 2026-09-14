import { useState, forwardRef, useImperativeHandle } from 'react';
import { useConfigStyles } from './useConfigStyles';

interface ChatConfig {
  enabled: boolean;
  github_repo: string;
  utterances_theme: string;
}

export interface ChatSectionRef {
  getData: () => ChatConfig;
  setData: (data: ChatConfig | undefined) => void;
}

const ChatSection = forwardRef<ChatSectionRef>((_props, ref) => {
  const [isOpen, setIsOpen] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [githubRepo, setGithubRepo] = useState('');
  const [utterancesTheme, setUtterancesTheme] = useState('github-light');
  const s = useConfigStyles();

  useImperativeHandle(ref, () => ({
    getData: () => ({ enabled, github_repo: githubRepo, utterances_theme: utterancesTheme }),
    setData: (data: ChatConfig | undefined) => {
      if ((window as any).IRIS_DEBUG) console.log('[ChatSection] setData called with:', data);
      if (data) {
        if ((window as any).IRIS_DEBUG) console.log('[ChatSection] Setting github_repo to:', data.github_repo);
        setEnabled(data.enabled ?? true);
        setGithubRepo(data.github_repo || '');
        setUtterancesTheme(data.utterances_theme || 'github-light');
      } else {
        if ((window as any).IRIS_DEBUG) console.log('[ChatSection] No chat config provided, using defaults');
        setEnabled(true);
        setGithubRepo('');
        setUtterancesTheme('github-light');
      }
    },
  }));

  const themeOptions = [
    { value: 'github-light', label: 'GitHub Light' },
    { value: 'github-dark', label: 'GitHub Dark' },
    { value: 'preferred-color-scheme', label: 'Preferred Color Scheme' },
    { value: 'github-dark-orange', label: 'GitHub Dark Orange' },
    { value: 'icy-dark', label: 'Icy Dark' },
    { value: 'dark-blue', label: 'Dark Blue' },
    { value: 'photon-dark', label: 'Photon Dark' },
  ];

  return (
    <div style={{ marginBottom: '8px' }}>
      <button onClick={() => setIsOpen(!isOpen)}
        style={{ ...s.accordionStyle, ...(isOpen ? s.accordionOpenStyle : {}) }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.theme.panelHeaderBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.theme.bgTertiary)}
      >
        <span>Chat</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.theme.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={s.panelStyle}>
          <p style={{ marginBottom: '20px', color: s.theme.gray600, fontSize: '14px' }}>
            Configure per-image discussions using GitHub Issues via Utterances.
            Each image gets its own discussion thread stored as a GitHub Issue.
          </p>

          {/* Enabled */}
          <div style={{ marginBottom: '20px' }}>
            <label style={s.labelStyle}>Enabled</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: s.theme.primary }} />
              <span style={{ fontSize: '13px', color: s.theme.gray900 }}>Enable chat feature</span>
            </label>
            <small style={{ ...s.descriptionStyle, marginTop: '4px' }}>Enable or disable the chat feature</small>
          </div>

          {/* GitHub Repository */}
          <div style={{ marginBottom: '20px' }}>
            <label style={s.labelStyle}>
              GitHub Repository {enabled && <span style={{ color: s.theme.alert }}>*</span>}
            </label>
            <input type="text" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repository" disabled={!enabled}
              style={{ ...s.inputStyle, opacity: enabled ? 1 : 0.6 }} />
            <small style={{ ...s.descriptionStyle, marginTop: '4px' }}>
              GitHub repository for storing discussions (format: owner/repo). Must be public and have Utterances app installed.
            </small>
            {enabled && !githubRepo && (
              <small style={{ ...s.errorText }}>GitHub repository is required when chat is enabled</small>
            )}
            {enabled && githubRepo && (
              <small style={{ ...s.descriptionStyle, marginTop: '4px' }}>
                Install Utterances app: <a href="https://github.com/apps/utterances" target="_blank" rel="noopener noreferrer"
                  style={{ color: s.theme.primary }}>github.com/apps/utterances</a>
              </small>
            )}
          </div>

          {/* Utterances Theme */}
          <div style={{ marginBottom: '20px' }}>
            <label style={s.labelStyle}>Theme</label>
            <select value={utterancesTheme} onChange={(e) => setUtterancesTheme(e.target.value)}
              disabled={!enabled}
              style={{ ...s.selectStyle, opacity: enabled ? 1 : 0.6, cursor: enabled ? 'pointer' : 'not-allowed' }}>
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <small style={{ ...s.descriptionStyle, marginTop: '4px' }}>Visual theme for the Utterances comment widget</small>
          </div>

          {/* Help text */}
          <div style={s.infoBox}>
            <strong style={{ color: s.theme.gray900 }}>Setup Instructions:</strong>
            <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px', color: s.theme.gray900, fontSize: '13px' }}>
              <li>Create a public GitHub repository (or use an existing one)</li>
              <li>Install the Utterances app: <a href="https://github.com/apps/utterances" target="_blank" rel="noopener noreferrer"
                style={{ color: s.theme.primary }}>github.com/apps/utterances</a></li>
              <li>Grant Utterances access to your repository</li>
              <li>Enter the repository name above (format: owner/repo)</li>
              <li>Save configuration and reload the page</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
});

ChatSection.displayName = 'ChatSection';
export default ChatSection;

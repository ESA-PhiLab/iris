/**
 * Image Chat Panel Component
 * 
 * Embeds Utterances comments for per-image discussions.
 * Each image gets its own unique thread stored as a GitHub Issue.
 * 
 * Utterances is a free, open-source commenting widget built on GitHub Issues.
 * Setup: https://utteranc.es/
 */

import React, { useEffect, useRef } from 'react';
import { useSegmentationStore } from '../../stores/segmentationStore';

interface ImageChatPanelProps {
  githubRepo: string;
  theme?: string;
  isOpen: boolean;
  onClose: () => void;
}

const ImageChatPanel: React.FC<ImageChatPanelProps> = ({ 
  githubRepo, 
  theme = 'github-light',
  isOpen,
  onClose
}) => {
  const currentImageId = useSegmentationStore((state) => state.currentImageId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCloseHovered, setIsCloseHovered] = React.useState(false);

  useEffect(() => {
    if (!currentImageId || !githubRepo || !containerRef.current || !isOpen) return;

    // Clear previous comments
    containerRef.current.innerHTML = '';

    // Create script element for Utterances
    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    // Configure Utterances
    script.setAttribute('repo', githubRepo);
    script.setAttribute('issue-term', `image-${currentImageId}`);
    script.setAttribute('theme', theme);
    script.setAttribute('label', 'iris-chat');
    
    // Add loading handler
    script.onload = () => {
      if ((window as any).IRIS_DEBUG) {
        console.log('Utterances script loaded successfully');
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Utterances script:', error);
    };
    
    // Append script to container
    containerRef.current.appendChild(script);

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [currentImageId, githubRepo, theme, isOpen]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (!githubRepo) {
      return (
        <div style={styles.placeholder}>
          <p style={styles.placeholderText}>
            💬 Chat is not configured. Please set <code>github_repo</code> in your project config.
          </p>
          <p style={styles.placeholderSubtext}>
            Utterances is a free commenting widget built on GitHub Issues.
            <br />
            Setup: Create a public GitHub repo, then set <code>"github_repo": "owner/repo"</code>
            <br />
            Install the app: <a href="https://github.com/apps/utterances" target="_blank" rel="noopener noreferrer">github.com/apps/utterances</a>
          </p>
        </div>
      );
    }

    if (!currentImageId) {
      return (
        <div style={styles.placeholder}>
          <p style={styles.placeholderText}>No image loaded</p>
        </div>
      );
    }

    return (
      <>
        <div style={styles.chatHeader}>
          <div>
            <h3 style={styles.chatTitle}>💬 Discussion</h3>
            <p style={styles.chatSubtitle}>{currentImageId}</p>
          </div>
        </div>
        <div 
          ref={containerRef}
          style={styles.utterancesContainer}
        />
      </>
    );
  };

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h3 style={styles.title}>Chat</h3>
        <button 
          onClick={onClose}
          onMouseEnter={() => setIsCloseHovered(true)}
          onMouseLeave={() => setIsCloseHovered(false)}
          style={{
            ...styles.closeButton,
            backgroundColor: isCloseHovered ? '#f0f0f0' : 'transparent',
          }}
          title="Close chat panel"
        >
          ✕
        </button>
      </div>
      <div style={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '400px',
    height: '100vh',
    backgroundColor: '#fff',
    borderLeft: '1px solid #ddd',
    boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f9f9f9',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
  },
  chatTitle: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
  },
  chatSubtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
    wordBreak: 'break-all',
  },
  utterancesContainer: {
    padding: '20px',
    flex: 1,
    pointerEvents: 'auto',
  },
  placeholder: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  placeholderText: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#999',
  },
  placeholderSubtext: {
    margin: 0,
    fontSize: '12px',
    color: '#aaa',
    lineHeight: '1.8',
  },
};

export default ImageChatPanel;

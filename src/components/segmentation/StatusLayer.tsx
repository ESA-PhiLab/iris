/**
 * What the page is busy with, and short notices
 */

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUiStore } from '../../stores/uiStore';

const StatusLayer: React.FC = () => {
  const { theme } = useTheme();
  const busy = useUiStore((state) => state.busy);
  const notice = useUiStore((state) => state.notice);

  return (
    <>
      {busy && (
        <div
          data-testid="busy-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.modalOverlay,
            cursor: 'wait',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: theme.panelBg,
            border: `1px solid ${theme.panelBorder}`,
            color: theme.gray900,
            fontSize: '14px',
          }}>
            <span className="iris-spinner" style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: `3px solid ${theme.panelBorder}`,
              borderTopColor: theme.primary,
              animation: 'iris-spin 0.8s linear infinite',
            }} />
            {busy}
          </div>
          <style>{'@keyframes iris-spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      )}
      {notice && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: '62px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1150,
            padding: '6px 14px',
            borderRadius: '6px',
            backgroundColor: theme.tooltipBg,
            color: theme.tooltipText,
            fontSize: '13px',
            pointerEvents: 'none',
          }}
        >
          {notice.text}
        </div>
      )}
    </>
  );
};

export default StatusLayer;

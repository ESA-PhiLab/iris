import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Views Tab Component
 * 
 * Placeholder for future views configuration functionality.
 * Currently displays "Not yet implemented" message matching legacy behavior.
 */
const ViewsTab: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div style={{ padding: '30px', textAlign: 'center' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.gray400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
      <p style={{ color: theme.gray500, fontSize: '13px', margin: 0 }}>
        Not yet implemented.
      </p>
    </div>
  );
};

export default ViewsTab;

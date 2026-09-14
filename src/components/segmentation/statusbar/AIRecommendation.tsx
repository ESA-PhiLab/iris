import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { BrainIcon } from '../../icons/ToolbarIcons';

const AIRecommendation: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        color: theme.toolbarText,
        fontSize: '13px',
        fontWeight: '500',
        minWidth: '200px',
      }}
    >
      <BrainIcon size={18} color={theme.toolbarText} />
      <div 
        id="ai-recommendation"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        AI is loading
      </div>
    </div>
  );
};

export default AIRecommendation;

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ImageIcon, BarChartIcon, ShieldIcon } from '../icons/ToolbarIcons';
import AIScore from './statusbar/AIScore';
import AIRecommendation from './statusbar/AIRecommendation';

interface BottomBarProps {
  onOpenImageInfo: () => void;
  onOpenConfusionMatrix: () => void;
}

const BottomBar: React.FC<BottomBarProps> = ({ 
  onOpenImageInfo, 
  onOpenConfusionMatrix 
}) => {
  const { theme } = useTheme();
  const w = window as any;
  const isAdmin = w.vars?.is_admin || false;
  const currentImageId = w.vars?.image_id || 'No image';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: theme.toolbarBgLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000,
        boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Left: Image Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onOpenImageInfo}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.toolbarBorder}`,
            color: theme.toolbarText,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.toolbarHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Image information"
        >
          <ImageIcon size={16} color={theme.toolbarText} />
          {currentImageId}
        </button>
        
        <button
          onClick={onOpenConfusionMatrix}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.toolbarBorder}`,
            color: theme.toolbarText,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.toolbarHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="View confusion matrix"
        >
          <BarChartIcon size={16} color={theme.toolbarText} />
          Stats
        </button>
      </div>

      {/* Center: AI Score and Recommendation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <AIScore onOpenConfusionMatrix={onOpenConfusionMatrix} />
        <AIRecommendation />
      </div>

      {/* Right: Admin Button */}
      {isAdmin && (
        <div>
          <button
            onClick={() => {
              window.location.href = '/admin/';
            }}
            style={{
              background: theme.buttonDangerBg,
              border: 'none',
              color: theme.toolbarText,
              cursor: 'pointer',
              padding: '8px 15px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonDangerHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonDangerBg)}
            title="Admin panel"
          >
            <ShieldIcon size={16} color={theme.toolbarText} />
            Admin
          </button>
        </div>
      )}
    </div>
  );
};

export default BottomBar;

import React from 'react';
import { useSegmentationStore } from '../../../stores/segmentationStore';
import { useTheme } from '../../../contexts/ThemeContext';

interface AIScoreProps {
  onOpenConfusionMatrix: () => void;
}

const AIScore: React.FC<AIScoreProps> = ({ onOpenConfusionMatrix }) => {
  const { theme } = useTheme();
  
  // Get AI score from confusion matrix in React store
  const confusionMatrix = useSegmentationStore(state => state.confusionMatrix);
  
  // Calculate display score - same as legacy round_number(score*100) + "%"
  const displayScore = confusionMatrix 
    ? Math.round(confusionMatrix.accuracyStats.overall * 100)
    : 0;

  return (
    <button
      onClick={onOpenConfusionMatrix}
      style={{
        background: 'transparent',
        border: `1px solid ${theme.toolbarBorder}`,
        color: theme.toolbarText,
        cursor: 'pointer',
        padding: '6px 12px',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        minWidth: '70px',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.toolbarHover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      title="View confusion matrix and accuracy statistics"
    >
      <div style={{ 
        fontSize: '18px', 
        fontWeight: '700',
        lineHeight: '1',
      }}>
        {displayScore}%
      </div>
      <div style={{ 
        fontSize: '10px', 
        fontWeight: '500',
        opacity: 0.9,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        AI Score
      </div>
    </button>
  );
};

export default AIScore;

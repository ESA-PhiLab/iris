import React from 'react';
import ToolButton from './toolbar/ToolButton';
import PaintbrushSelector from './toolbar/PaintbrushSelector';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useTheme } from '../../contexts/ThemeContext';

interface LeftToolbarProps {
  onResetMask: () => void;
}

const LeftToolbar: React.FC<LeftToolbarProps> = ({ onResetMask }) => {
  const { theme } = useTheme();
  
  const [isExpanded, setIsExpanded] = React.useState(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem('leftToolbarExpanded');
    return saved ? JSON.parse(saved) : false;
  });

  const { 
    currentTool, 
    setCurrentTool, 
    predictMask, 
    resetViews, 
    isLoading,
    showErrorModal 
  } = useSegmentationStore();
  
  // Save preference when it changes
  React.useEffect(() => {
    localStorage.setItem('leftToolbarExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);
  
  const handlePredictMask = async () => {
    try {
      await predictMask();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showErrorModal(errorMessage, 'AI Prediction Error');
    }
  };

  const handleResetViews = () => {
    resetViews();
  };

  const handleUndo = () => {
    const w = window as any;
    if (w.undo) w.undo();
  };

  const handleRedo = () => {
    const w = window as any;
    if (w.redo) w.redo();
  };
  
  const toolbarWidth = isExpanded ? 180 : 60;
  
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: '50px',
        bottom: '60px',
        width: `${toolbarWidth}px`,
        backgroundColor: theme.toolbarBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isExpanded ? 'stretch' : 'center',
        padding: '10px 0',
        gap: '5px',
        zIndex: 900,
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        overflowX: 'hidden',
        listStyle: 'none',
        transition: 'width 0.3s ease',
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'transparent',
          border: `1px solid ${theme.toolbarBorder}`,
          color: theme.toolbarText,
          cursor: 'pointer',
          padding: '5px',
          margin: '0 10px 10px 10px',
          borderRadius: '4px',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
        title={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
      >
        <span>{isExpanded ? '◀' : '▶'}</span>
        {isExpanded && <span style={{ fontSize: '12px' }}>Collapse</span>}
      </button>

      {/* Drawing Tools */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', listStyle: 'none', width: '100%', padding: isExpanded ? '0 15px' : '0 5px', alignItems: isExpanded ? 'stretch' : 'center', boxSizing: 'border-box' }}>
        <div style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}>
          <ToolButton
            id="tb_tool_move"
            icon="/segmentation/static/icons/move.png"
            checked={currentTool === 'move'}
            onClick={() => setCurrentTool('move')}
            disabled={isLoading}
            title="Move/Pan"
            label={isExpanded ? 'Move' : undefined}
          />
        </div>
        
        <PaintbrushSelector
          id="tb_tool_draw"
          icon="/segmentation/static/icons/pencil.png"
          checked={currentTool === 'draw'}
          onClick={() => setCurrentTool('draw')}
          disabled={isLoading}
          title="Draw pixels"
          dropdownType="draw"
          label={isExpanded ? 'Draw' : undefined}
          style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}
        />
        
        <PaintbrushSelector
          id="tb_tool_eraser"
          icon="/segmentation/static/icons/eraser.png"
          checked={currentTool === 'eraser'}
          onClick={() => setCurrentTool('eraser')}
          disabled={isLoading}
          title="Erase pixels"
          dropdownType="eraser"
          label={isExpanded ? 'Erase' : undefined}
          style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}
        />
      </div>

      {/* Separator */}
      <div style={{ width: isExpanded ? 'calc(100% - 30px)' : '80%', height: '1px', backgroundColor: theme.toolbarBorder, margin: '5px auto' }} />

      {/* Editing Tools */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', listStyle: 'none', width: '100%', padding: isExpanded ? '0 15px' : '0 5px', alignItems: isExpanded ? 'stretch' : 'center', boxSizing: 'border-box' }}>
        <div style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}>
          <ToolButton
            id="tb_undo"
            icon="/segmentation/static/icons/undo.png"
            onClick={handleUndo}
            title="Undo"
            label={isExpanded ? 'Undo' : undefined}
          />
        </div>
        
        <div style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}>
          <ToolButton
            id="tb_redo"
            icon="/segmentation/static/icons/redo.png"
            onClick={handleRedo}
            title="Redo"
            label={isExpanded ? 'Redo' : undefined}
          />
        </div>
      </div>

      {/* Separator */}
      <div style={{ width: isExpanded ? 'calc(100% - 30px)' : '80%', height: '1px', backgroundColor: theme.toolbarBorder, margin: '5px auto' }} />

      {/* AI & Reset Tools */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', listStyle: 'none', width: '100%', padding: isExpanded ? '0 15px' : '0 5px', alignItems: isExpanded ? 'stretch' : 'center', boxSizing: 'border-box' }}>
        <div style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}>
          <ToolButton
            id="tb_predict_mask"
            icon="/segmentation/static/icons/ai.png"
            onClick={handlePredictMask}
            disabled={isLoading}
            title={isLoading ? "Predicting..." : "Predict mask using AI"}
            label={isExpanded ? 'AI Predict' : undefined}
          />
        </div>
        
        <div style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}>
          <ToolButton
            id="tb_reset_mask"
            icon="/segmentation/static/icons/reset_mask.png"
            onClick={onResetMask}
            disabled={isLoading}
            title="Reset mask"
            label={isExpanded ? 'Reset Mask' : undefined}
          />
        </div>
        
        <div style={isExpanded ? { maxWidth: '100%' } : { width: '50px' }}>
          <ToolButton
            id="tb_tool_reset_views"
            icon="/segmentation/static/icons/reset_views.png"
            onClick={handleResetViews}
            disabled={isLoading}
            title="Reset views"
            label={isExpanded ? 'Reset Views' : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default LeftToolbar;

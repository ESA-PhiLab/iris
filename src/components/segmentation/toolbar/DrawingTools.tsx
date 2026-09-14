import React from 'react';
import { useSegmentationStore } from '../../../stores/segmentationStore';
import ToolButton from './ToolButton';
import PaintbrushSelector from './PaintbrushSelector';

interface DrawingToolsProps {
  onResetMask: () => void;
}

const DrawingTools: React.FC<DrawingToolsProps> = ({ onResetMask }) => {
  // PHASE 1: Use store hooks instead of direct window access
  // PHASE 2: Add navigation & actions hooks
  const { 
    currentTool, 
    setCurrentTool, 
    predictMask, 
    resetViews, 
    isLoading,
    showErrorModal 
  } = useSegmentationStore();
  
  const handlePredictMask = async () => {
    console.log('[IRIS] handlePredictMask called');
    try {
      await predictMask();
      console.log('[IRIS] predictMask completed successfully');
    } catch (error) {
      console.error('[IRIS] Failed to predict mask:', error);
      
      // Show modern React error modal
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log('[IRIS] Calling showErrorModal with:', errorMessage);
      showErrorModal(errorMessage, 'AI Prediction Error');
    }
  };

  const handleResetViews = () => {
    resetViews();
  };
  
  return (
    <>
      <ToolButton
        id="tb_tool_move"
        icon="/segmentation/static/icons/move.png"
        checked={currentTool === 'move'}
        onClick={() => setCurrentTool('move')}
        disabled={isLoading}
      />
      <ToolButton
        id="tb_tool_reset_views"
        icon="/segmentation/static/icons/reset_views.png"
        onClick={handleResetViews}
        disabled={isLoading}
        title="Reset views"
      />
      <PaintbrushSelector
        id="tb_tool_draw"
        icon="/segmentation/static/icons/pencil.png"
        checked={currentTool === 'draw'}
        onClick={() => setCurrentTool('draw')}
        disabled={isLoading}
        title="Draw pixels"
        dropdownType="draw"
      />
      <PaintbrushSelector
        id="tb_tool_eraser"
        icon="/segmentation/static/icons/eraser.png"
        checked={currentTool === 'eraser'}
        onClick={() => setCurrentTool('eraser')}
        disabled={isLoading}
        title="Erase pixels"
        dropdownType="eraser"
      />
      <ToolButton
        id="tb_reset_mask"
        icon="/segmentation/static/icons/reset_mask.png"
        onClick={onResetMask}
        disabled={isLoading}
        title="Reset mask"
      />
      <ToolButton
        id="tb_predict_mask"
        icon="/segmentation/static/icons/ai.png"
        onClick={handlePredictMask}
        disabled={isLoading}
        title={isLoading ? "Predicting..." : "Predict mask using AI"}
      />
    </>
  );
};

export default DrawingTools;

import React from 'react';
import ToolButton from './toolbar/ToolButton';
import PaintbrushSelector from './toolbar/PaintbrushSelector';
import Sidebar, { SidebarGroup } from './Sidebar';
import { useSegmentationStore } from '../../stores/segmentationStore';

interface LeftToolbarProps {
  expanded: boolean;
  onToggle: () => void;
  onResetMask: () => void;
}

const LeftToolbar: React.FC<LeftToolbarProps> = ({ expanded, onToggle, onResetMask }) => {
  const {
    currentTool,
    setCurrentTool,
    predictMask,
    resetViews,
    isLoading,
    showErrorModal
  } = useSegmentationStore();

  const handlePredictMask = async () => {
    try {
      await predictMask();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showErrorModal(errorMessage, 'AI Prediction Error');
    }
  };

  const handleUndo = () => {
    const w = window as any;
    if (w.undo) w.undo();
  };

  const handleRedo = () => {
    const w = window as any;
    if (w.redo) w.redo();
  };

  // Labels only fit in the expanded column
  const label = (text: string) => (expanded ? text : undefined);

  return (
    <Sidebar side="left" expanded={expanded} onToggle={onToggle} name="toolbar" shortcut="leftToolbar">
      {/* Drawing Tools */}
      <SidebarGroup expanded={expanded}>
        <ToolButton
          id="tb_tool_move"
          icon="/segmentation/static/icons/move.png"
          checked={currentTool === 'move'}
          onClick={() => setCurrentTool('move')}
          disabled={isLoading}
          title="Move/Pan"
          label={label('Move')}
          shortcut="move"
        />
        <PaintbrushSelector
          id="tb_tool_draw"
          icon="/segmentation/static/icons/pencil.png"
          checked={currentTool === 'draw'}
          onClick={() => setCurrentTool('draw')}
          disabled={isLoading}
          title="Draw pixels, brush size with Shift+Scroll"
          dropdownType="draw"
          label={label('Draw')}
          shortcut="draw"
        />
        <PaintbrushSelector
          id="tb_tool_eraser"
          icon="/segmentation/static/icons/eraser.png"
          checked={currentTool === 'eraser'}
          onClick={() => setCurrentTool('eraser')}
          disabled={isLoading}
          title="Erase pixels, brush size with Shift+Scroll"
          dropdownType="eraser"
          label={label('Erase')}
          shortcut="eraser"
        />
      </SidebarGroup>

      {/* Editing Tools */}
      <SidebarGroup expanded={expanded}>
        <ToolButton
          id="tb_undo"
          icon="/segmentation/static/icons/undo.png"
          onClick={handleUndo}
          title="Undo"
          label={label('Undo')}
          shortcut="undo"
        />
        <ToolButton
          id="tb_redo"
          icon="/segmentation/static/icons/redo.png"
          onClick={handleRedo}
          title="Redo"
          label={label('Redo')}
          shortcut="redo"
        />
      </SidebarGroup>

      {/* AI & Reset Tools */}
      <SidebarGroup expanded={expanded} last>
        <ToolButton
          id="tb_predict_mask"
          icon="/segmentation/static/icons/ai.png"
          onClick={handlePredictMask}
          disabled={isLoading}
          title={isLoading ? 'Predicting...' : 'Predict mask using AI'}
          label={label('AI Predict')}
          shortcut="predict"
        />
        <ToolButton
          id="tb_reset_mask"
          icon="/segmentation/static/icons/reset_mask.png"
          onClick={onResetMask}
          disabled={isLoading}
          title="Reset mask"
          label={label('Reset Mask')}
          shortcut="resetMask"
        />
        <ToolButton
          id="tb_tool_reset_views"
          icon="/segmentation/static/icons/reset_views.png"
          onClick={resetViews}
          disabled={isLoading}
          title="Reset views"
          label={label('Reset Views')}
          shortcut="resetViews"
        />
      </SidebarGroup>
    </Sidebar>
  );
};

export default LeftToolbar;

import React from 'react';
import ToolButton from './toolbar/ToolButton';
import BrushTool, { biggerBrushSize, smallerBrushSize } from './toolbar/BrushTool';
import Sidebar, { SidebarGroup } from './Sidebar';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useShortcut } from '../../hooks/useShortcut';
import { trainAI } from '../../segmentation/commands';
import { icon } from '../icons/icons';

interface LeftToolbarProps {
  expanded: boolean;
  onToggle: () => void;
  onResetMask: () => void;
}

const LeftToolbar: React.FC<LeftToolbarProps> = ({ expanded, onToggle, onResetMask }) => {
  const currentTool = useSegmentationStore((state) => state.currentTool);
  const setCurrentTool = useSegmentationStore((state) => state.setCurrentTool);
  const undo = useSegmentationStore((state) => state.undo);
  const redo = useSegmentationStore((state) => state.redo);
  const resetViews = useSegmentationStore((state) => state.resetViews);
  const isLoading = useSegmentationStore((state) => state.isLoading);

  // + and - resize the brush in use
  const resizeBrush = (step: (size: number) => number) => {
    const { currentTool: tool, brushSizes, setBrushSize } = useSegmentationStore.getState();
    if (tool !== 'move') setBrushSize(tool, step(brushSizes[tool]));
  };
  useShortcut('brushBigger', () => resizeBrush(biggerBrushSize));
  useShortcut('brushSmaller', () => resizeBrush(smallerBrushSize));

  // Labels only fit in the expanded column
  const label = (text: string) => (expanded ? text : undefined);

  return (
    <Sidebar side="left" expanded={expanded} onToggle={onToggle} name="toolbar" shortcut="leftToolbar">
      {/* Drawing Tools */}
      <SidebarGroup expanded={expanded}>
        <ToolButton
          id="tb_tool_move"
          icon={icon('move')}
          checked={currentTool === 'move'}
          onClick={() => setCurrentTool('move')}
          disabled={isLoading}
          title="Move/Pan"
          label={label('Move')}
          shortcut="move"
        />
        <BrushTool
          tool="draw"
          id="tb_tool_draw"
          icon={icon('pencil')}
          disabled={isLoading}
          title="Draw pixels"
          label={label('Draw')}
          shortcut="draw"
        />
        <BrushTool
          tool="eraser"
          id="tb_tool_eraser"
          icon={icon('eraser')}
          disabled={isLoading}
          title="Erase pixels"
          label={label('Erase')}
          shortcut="eraser"
        />
      </SidebarGroup>

      {/* Editing Tools */}
      <SidebarGroup expanded={expanded}>
        <ToolButton
          id="tb_undo"
          icon={icon('undo')}
          onClick={undo}
          title="Undo"
          label={label('Undo')}
          shortcut="undo"
        />
        <ToolButton
          id="tb_redo"
          icon={icon('redo')}
          onClick={redo}
          title="Redo"
          label={label('Redo')}
          shortcut="redo"
        />
      </SidebarGroup>

      {/* AI & Reset Tools */}
      <SidebarGroup expanded={expanded} last>
        <ToolButton
          id="tb_predict_mask"
          icon={icon('ai')}
          onClick={trainAI}
          disabled={isLoading}
          title={isLoading ? 'Predicting...' : 'Predict mask using AI'}
          label={label('AI Predict')}
          shortcut="predict"
        />
        <ToolButton
          id="tb_reset_mask"
          icon={icon('reset_mask')}
          onClick={onResetMask}
          disabled={isLoading}
          title="Reset mask"
          label={label('Reset Mask')}
          shortcut="resetMask"
        />
        <ToolButton
          id="tb_tool_reset_views"
          icon={icon('reset_views')}
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

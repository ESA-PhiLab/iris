import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import BrushTool, { BRUSH_SIZES, biggerBrushSize, smallerBrushSize } from './BrushTool';
import { useSegmentationStore } from '../../../stores/segmentationStore';

const renderTools = () => render(
  <>
    <BrushTool tool="draw" id="tb_tool_draw" icon="/pencil.png" title="Draw pixels" shortcut="draw" />
    <BrushTool tool="eraser" id="tb_tool_eraser" icon="/eraser.png" title="Erase pixels" shortcut="eraser" />
  </>
);

describe('BrushTool', () => {
  beforeEach(() => {
    useSegmentationStore.setState({ currentTool: 'draw', toolSize: 5, brushSizes: { draw: 5, eraser: 5 } });
  });

  it('steps through the brush sizes', () => {
    expect(biggerBrushSize(5)).toBe(8);
    expect(smallerBrushSize(5)).toBe(3);
    expect(biggerBrushSize(4)).toBe(5);
    expect(smallerBrushSize(1)).toBe(1);
    expect(biggerBrushSize(BRUSH_SIZES[BRUSH_SIZES.length - 1])).toBe(100);
  });

  it('makes the brush bigger and smaller', () => {
    renderTools();

    fireEvent.click(screen.getByLabelText('Bigger brush, 5 px now'));
    expect(useSegmentationStore.getState().brushSizes.draw).toBe(8);
    expect(useSegmentationStore.getState().toolSize).toBe(8);

    fireEvent.click(screen.getByLabelText('Smaller brush, 8 px now'));
    expect(useSegmentationStore.getState().brushSizes.draw).toBe(5);
  });

  it('gives the eraser its own size', () => {
    renderTools();

    fireEvent.click(screen.getByLabelText('Bigger eraser, 5 px now'));
    expect(useSegmentationStore.getState().brushSizes).toEqual({ draw: 5, eraser: 8 });
    // The drawing brush is in use and keeps its size
    expect(useSegmentationStore.getState().toolSize).toBe(5);

    useSegmentationStore.getState().setCurrentTool('eraser');
    expect(useSegmentationStore.getState().toolSize).toBe(8);
    useSegmentationStore.getState().setCurrentTool('draw');
    expect(useSegmentationStore.getState().toolSize).toBe(5);
  });

  it('selects its tool', () => {
    renderTools();

    fireEvent.click(document.getElementById('tb_tool_eraser')!);
    expect(useSegmentationStore.getState().currentTool).toBe('eraser');
  });
});

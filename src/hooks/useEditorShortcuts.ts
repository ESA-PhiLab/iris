/**
 * Shortcuts of the editor: tools, classes, mask, adjustments, views and moving
 * between images
 */

import { useSegmentationStore } from '../stores/segmentationStore';
import { useViewManagerStore } from '../stores/viewManagerStore';
import { goToNextImage, goToPreviousImage } from '../segmentation/navigation';
import { saveMask, trainAI } from '../segmentation/commands';
import { useShortcut } from './useShortcut';

const editor = () => useSegmentationStore.getState();
const views = () => useViewManagerStore.getState();

export const useEditorShortcuts = ({ onResetMask }: { onResetMask: () => void }) => {
  useShortcut('nextImage', () => { goToNextImage(); });
  useShortcut('previousImage', () => { goToPreviousImage(); });
  useShortcut('save', () => { saveMask(); });

  useShortcut('undo', () => editor().undo());
  useShortcut('redo', () => editor().redo());
  useShortcut('move', () => editor().setCurrentTool('move'));
  useShortcut('draw', () => editor().setCurrentTool('draw'));
  useShortcut('eraser', () => editor().setCurrentTool('eraser'));
  useShortcut('selectClass', (event) => {
    // Class ids start at 0, the keys at 1
    const classId = Number(event.key) - 1;
    if (classId < editor().classes.length) editor().setCurrentClass(classId);
  });
  useShortcut('predict', () => { trainAI(); });
  useShortcut('resetMask', onResetMask);
  useShortcut('resetViews', () => editor().resetViews());

  useShortcut('toggleMask', () => editor().toggleMask());
  useShortcut('maskFinal', () => editor().setMaskType('final'));
  useShortcut('maskUser', () => editor().setMaskType('user'));
  useShortcut('maskErrors', () => editor().setMaskType('errors'));

  useShortcut('brightness', (event) => editor().changeBrightness(event.key === 'ArrowUp'));
  useShortcut('saturation', (event) => editor().changeSaturation(event.key === 'ArrowRight'));
  useShortcut('contrast', () => editor().setContrast(!editor().contrast));
  useShortcut('invert', () => editor().setInvert(!editor().invert));
  useShortcut('resetFilters', () => editor().resetFilters());

  useShortcut('viewControls', () => views().toggleControls());
  useShortcut('nextViewGroup', () => views().showNextGroup());
};

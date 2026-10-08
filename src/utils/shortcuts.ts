/**
 * Keyboard shortcuts of the segmentation page
 *
 * The keys are handled by key_down() in segmentation.js. The buttons show
 * them in their tooltips and the help lists them all.
 */

export const SHORTCUTS = {
  previousImage: { key: 'Backspace', description: 'Save this image and open the previous one' },
  nextImage: { key: 'Enter', description: 'Save this image and open the next one' },
  save: { key: 'S', description: 'Save mask' },
  undo: { key: 'U', description: 'Undo' },
  redo: { key: 'R', description: 'Redo' },
  selectClass: { key: '1..9', description: 'Select class' },
  move: { key: 'W', description: 'Move tool' },
  draw: { key: 'D', description: 'Draw tool' },
  eraser: { key: 'E', description: 'Eraser' },
  brushSize: { key: 'Shift+Scroll', description: 'Change brush size' },
  predict: { key: 'A', description: 'Train AI assistant' },
  resetMask: { key: 'N', description: 'Reset mask' },
  resetViews: { key: 'Y', description: 'Reset views' },
  toggleMask: { key: 'Space', description: 'Toggle mask visibility' },
  maskFinal: { key: 'F', description: 'Final mask' },
  maskUser: { key: 'G', description: 'User mask' },
  maskErrors: { key: 'H', description: 'Error mask' },
  contrast: { key: 'C', description: 'Toggle contrast' },
  invert: { key: 'I', description: 'Toggle invert' },
  brightness: { key: '↑ / ↓', description: 'Brightness ±10%' },
  saturation: { key: '← / →', description: 'Saturation ±20%' },
  resetFilters: { key: 'X', description: 'Reset filters' },
  viewControls: { key: 'V', description: 'Show or hide the view controls' },
  nextViewGroup: { key: 'B', description: 'Next view group' },
} as const;

export type ShortcutName = keyof typeof SHORTCUTS;

/** Tooltip of a control with its shortcut, e.g. "Draw pixels (D)" */
export const withShortcut = (title: string, name: ShortcutName) =>
  `${title} (${SHORTCUTS[name].key})`;

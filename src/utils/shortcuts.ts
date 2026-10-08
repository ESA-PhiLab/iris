/**
 * Keyboard shortcuts of the segmentation page
 *
 * Every control has one. The drawing, mask and filter keys are handled by
 * key_down() in segmentation.js, the keys of the React controls by
 * useShortcut(). The tooltip of each control shows its key and the help lists
 * them all.
 */

export interface Shortcut {
  /** Key as shown to the user */
  key: string;
  /** KeyboardEvent.code, for the shortcuts handled by useShortcut() */
  code?: string;
  /** Other characters that trigger it, e.g. = for + without Shift */
  alternatives?: string[];
  description: string;
}

export const SHORTCUTS = {
  previousImage: { key: 'Backspace', description: 'Save this image and open the previous one' },
  nextImage: { key: 'Enter', description: 'Save this image and open the next one' },
  save: { key: 'S', description: 'Save mask' },
  exportGeoTIFF: { key: 'O', code: 'KeyO', description: 'Export the image and mask as GeoTIFF' },
  undo: { key: 'U', description: 'Undo' },
  redo: { key: 'R', description: 'Redo' },
  selectClass: { key: '1..9', description: 'Select class' },
  classDialog: { key: 'K', code: 'KeyK', description: 'Open the list of classes' },
  move: { key: 'W', description: 'Move tool' },
  draw: { key: 'D', description: 'Draw tool' },
  eraser: { key: 'E', description: 'Eraser' },
  brushBigger: { key: '+', code: 'Equal', alternatives: ['='], description: 'Bigger brush or eraser, whichever is selected' },
  brushSmaller: { key: '-', code: 'Minus', description: 'Smaller brush or eraser, whichever is selected' },
  brushSize: { key: 'Shift+Scroll', description: 'Change brush size' },
  predict: { key: 'A', description: 'Train AI assistant' },
  resetMask: { key: 'N', description: 'Reset mask' },
  resetViews: { key: 'Y', description: 'Reset views' },
  toggleMask: { key: 'Space', description: 'Show or hide the mask' },
  toggleImage: { key: 'P', code: 'KeyP', description: 'Show or hide the image' },
  toggleSatellite: { key: 'M', code: 'KeyM', description: 'Show or hide the satellite imagery' },
  maskFinal: { key: 'F', description: 'Final mask' },
  maskUser: { key: 'G', description: 'User mask' },
  maskErrors: { key: 'H', description: 'Error mask' },
  brightness: { key: '↑ ↓', description: 'Brightness ±10%' },
  saturation: { key: '← →', description: 'Saturation ±20%' },
  contrast: { key: 'C', description: 'Toggle contrast' },
  invert: { key: 'I', description: 'Toggle invert' },
  resetFilters: { key: 'X', description: 'Reset the adjustments' },
  foldLayers: { key: 'L', code: 'KeyL', description: 'Fold or unfold the layers' },
  foldAdjustments: { key: 'J', code: 'KeyJ', description: 'Fold or unfold the adjustments' },
  viewControls: { key: 'V', description: 'Show or hide the view controls' },
  nextViewGroup: { key: 'B', description: 'Next view group' },
  leftToolbar: { key: '[', code: 'BracketLeft', description: 'Expand or collapse the toolbar' },
  rightPanel: { key: ']', code: 'BracketRight', description: 'Show or hide the side panel' },
  imageInfo: { key: 'T', code: 'KeyT', description: 'Image information' },
  stats: { key: 'Q', code: 'KeyQ', description: 'Confusion matrix and statistics' },
  profile: { key: '.', code: 'Period', description: 'User profile' },
  settings: { key: ',', code: 'Comma', description: 'Settings' },
  help: { key: '?', code: 'Slash', description: 'Help' },
} satisfies Record<string, Shortcut>;

export type ShortcutName = keyof typeof SHORTCUTS;

/**
 * Props that make a control show a tooltip when the mouse is over it (see
 * TooltipLayer): what the control does and, when it has one, its shortcut.
 */
export const tooltip = (label: string, name?: ShortcutName) => ({
  'data-tooltip': label,
  ...(name ? { 'data-shortcut': SHORTCUTS[name].key } : {}),
});

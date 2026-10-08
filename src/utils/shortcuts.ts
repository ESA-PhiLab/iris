/**
 * Keyboard shortcuts of the segmentation page
 *
 * Every control has one, bound with useShortcut(). The tooltip of each control
 * shows its key and the help lists them all.
 */

export interface Shortcut {
  /** Key as shown to the user */
  key: string;
  /** KeyboardEvent.key values that trigger it, when not just the key shown */
  keys?: string[];
  /** KeyboardEvent.code, matched instead when Alt changes the character */
  code?: string;
  /** Other characters that trigger it, e.g. = for + without Shift */
  alternatives?: string[];
  /** Keeps acting while the key is held down */
  repeat?: boolean;
  description: string;
}

export const SHORTCUTS = {
  previousImage: { key: 'Backspace', description: 'Save this image and open the previous one' },
  nextImage: { key: 'Enter', description: 'Save this image and open the next one' },
  save: { key: 'S', code: 'KeyS', description: 'Save mask' },
  exportGeoTIFF: { key: 'O', code: 'KeyO', description: 'Export the image and mask as GeoTIFF' },
  undo: { key: 'U', code: 'KeyU', description: 'Undo' },
  redo: { key: 'R', code: 'KeyR', description: 'Redo' },
  selectClass: { key: '1..9', keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], description: 'Select class' },
  classDialog: { key: 'K', code: 'KeyK', description: 'Open the list of classes' },
  move: { key: 'W', code: 'KeyW', description: 'Move tool' },
  draw: { key: 'D', code: 'KeyD', description: 'Draw tool' },
  eraser: { key: 'E', code: 'KeyE', description: 'Eraser' },
  brushBigger: { key: '+', code: 'Equal', alternatives: ['='], repeat: true, description: 'Bigger brush or eraser, whichever is selected' },
  brushSmaller: { key: '-', code: 'Minus', repeat: true, description: 'Smaller brush or eraser, whichever is selected' },
  brushSize: { key: 'Shift+Scroll', keys: [], description: 'Change brush size' },
  predict: { key: 'A', code: 'KeyA', description: 'Train AI assistant' },
  resetMask: { key: 'N', code: 'KeyN', description: 'Reset mask' },
  resetViews: { key: 'Y', code: 'KeyY', description: 'Reset views' },
  toggleMask: { key: 'Space', keys: [' '], description: 'Show or hide the mask' },
  toggleImage: { key: 'P', code: 'KeyP', description: 'Show or hide the image' },
  toggleSatellite: { key: 'M', code: 'KeyM', description: 'Show or hide the satellite imagery' },
  maskFinal: { key: 'F', code: 'KeyF', description: 'Final mask' },
  maskUser: { key: 'G', code: 'KeyG', description: 'User mask' },
  maskErrors: { key: 'H', code: 'KeyH', description: 'Error mask' },
  brightness: { key: '↑ ↓', keys: ['ArrowUp', 'ArrowDown'], repeat: true, description: 'Brightness ±10%' },
  saturation: { key: '← →', keys: ['ArrowRight', 'ArrowLeft'], repeat: true, description: 'Saturation ±20%' },
  contrast: { key: 'C', code: 'KeyC', description: 'Toggle contrast' },
  invert: { key: 'I', code: 'KeyI', description: 'Toggle invert' },
  resetFilters: { key: 'X', code: 'KeyX', description: 'Reset the adjustments' },
  foldLayers: { key: 'L', code: 'KeyL', description: 'Fold or unfold the layers' },
  foldAdjustments: { key: 'J', code: 'KeyJ', description: 'Fold or unfold the adjustments' },
  viewControls: { key: 'V', code: 'KeyV', description: 'Show or hide the view controls' },
  nextViewGroup: { key: 'B', code: 'KeyB', description: 'Next view group' },
  leftToolbar: { key: '[', code: 'BracketLeft', description: 'Expand or collapse the toolbar' },
  rightPanel: { key: ']', code: 'BracketRight', description: 'Show or hide the side panel' },
  imageInfo: { key: 'T', code: 'KeyT', description: 'Image information' },
  stats: { key: 'Q', code: 'KeyQ', description: 'Confusion matrix and statistics' },
  review: { key: 'Z', code: 'KeyZ', description: 'Review the masks of all users' },
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

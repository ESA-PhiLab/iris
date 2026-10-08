/**
 * What the buttons and the shortcuts of the editor do, with errors shown to
 * the user
 */

import { useSegmentationStore } from '../stores/segmentationStore';
import { useUiStore } from '../stores/uiStore';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Train the AI on the drawn pixels and let it fill in the rest of the mask */
export const trainAI = async () => {
  try {
    await useSegmentationStore.getState().predictMask();
  } catch (error) {
    useUiStore.getState().showErrorModal(message(error), 'AI Prediction Error');
  }
};

/** Save the mask; a failure is shown by the store */
export const saveMask = async () => {
  try {
    await useSegmentationStore.getState().saveCurrentMask();
  } catch {
    // Shown already
  }
};

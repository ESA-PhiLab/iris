/**
 * Moving between images
 *
 * Each image opens in its own page load. Before leaving an image the mask is
 * saved, and when the user edited it, the questions about the mask (how
 * difficult it was, notes, whether it is complete) come first.
 */

import { useSegmentationStore } from '../stores/segmentationStore';
import { useUiStore } from '../stores/uiStore';
import { backend } from '../services/backend';

/** Open another image, without saving or asking */
export const openImage = (imageId: string) => {
  window.location.href = backend().pageUrl(imageId);
};

/** Save the mask and open another image, asking about the mask first if ask is set */
export const goToImage = async (imageId: string, { ask = true } = {}) => {
  const store = useSegmentationStore.getState();
  if (store.isLoading) return;
  if (store.maskChanged) {
    try {
      await store.saveCurrentMask();
    } catch {
      // saveCurrentMask showed what went wrong; stay on the image
      return;
    }
  }
  if (ask && useSegmentationStore.getState().showDialogueBeforeNextImage) {
    useUiStore.getState().setLeavingTo(imageId);
    return;
  }
  openImage(imageId);
};

export const goToNextImage = () => {
  const next = useSegmentationStore.getState().getNextImageId();
  if (next) return goToImage(next);
  useUiStore.getState().notify('No more images');
};

export const goToPreviousImage = () => {
  const previous = useSegmentationStore.getState().getPrevImageId();
  if (previous) return goToImage(previous, { ask: false });
  useUiStore.getState().notify('Already at the first image');
};

/**
 * Tests for show_dialogue_before_next_image migration to React store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSegmentationStore } from '../../../stores/segmentationStore';

describe('showDialogueBeforeNextImage Store Migration', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSegmentationStore.setState({
      showDialogueBeforeNextImage: false
    });
  });

  it('should initialize with false', () => {
    const state = useSegmentationStore.getState();
    expect(state.showDialogueBeforeNextImage).toBe(false);
  });

  it('should set showDialogueBeforeNextImage to true', () => {
    const { setShowDialogueBeforeNextImage } = useSegmentationStore.getState();
    
    setShowDialogueBeforeNextImage(true);
    
    const state = useSegmentationStore.getState();
    expect(state.showDialogueBeforeNextImage).toBe(true);
  });

  it('should set showDialogueBeforeNextImage to false', () => {
    const { setShowDialogueBeforeNextImage } = useSegmentationStore.getState();
    
    // First set to true
    setShowDialogueBeforeNextImage(true);
    expect(useSegmentationStore.getState().showDialogueBeforeNextImage).toBe(true);
    
    // Then set to false
    setShowDialogueBeforeNextImage(false);
    expect(useSegmentationStore.getState().showDialogueBeforeNextImage).toBe(false);
  });

  it('should be accessible via window.segmentationStore', () => {
    // Verify the bridge exists
    expect((window as any).segmentationStore).toBeDefined();
    expect((window as any).segmentationStore.getState).toBeDefined();
    
    // Test setting via window bridge
    (window as any).segmentationStore.getState().setShowDialogueBeforeNextImage(true);
    
    const state = useSegmentationStore.getState();
    expect(state.showDialogueBeforeNextImage).toBe(true);
  });

  it('should maintain state across multiple calls', () => {
    const { setShowDialogueBeforeNextImage } = useSegmentationStore.getState();
    
    // Simulate user actions that set the flag
    setShowDialogueBeforeNextImage(true);
    expect(useSegmentationStore.getState().showDialogueBeforeNextImage).toBe(true);
    
    setShowDialogueBeforeNextImage(true); // Set again
    expect(useSegmentationStore.getState().showDialogueBeforeNextImage).toBe(true);
    
    setShowDialogueBeforeNextImage(false); // Clear
    expect(useSegmentationStore.getState().showDialogueBeforeNextImage).toBe(false);
  });
});

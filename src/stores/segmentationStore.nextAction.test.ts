/**
 * Tests for vars.next_action migration to React store
 */

import { vi } from 'vitest';
import { useSegmentationStore } from './segmentationStore';

describe('SegmentationStore - Next Action Migration', () => {
  beforeEach(() => {
    useSegmentationStore.getState().setNextAction(null);
  });

  it('should manage nextAction state', async () => {
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const { setNextAction } = useSegmentationStore.getState();
    
    expect(useSegmentationStore.getState().nextAction).toBeNull();
    
    setNextAction(mockCallback);
    expect(useSegmentationStore.getState().nextAction).toBe(mockCallback);
    
    // Should execute callback
    await useSegmentationStore.getState().nextAction?.();
    expect(mockCallback).toHaveBeenCalledTimes(1);
    
    setNextAction(null);
    expect(useSegmentationStore.getState().nextAction).toBeNull();
  });

  it('should provide helper functions', () => {
    const w = window as any;
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    
    w.setNextActionInStore(mockCallback);
    expect(useSegmentationStore.getState().nextAction).toBe(mockCallback);
    expect(w.getNextActionFromStore()).toBe(mockCallback);
  });
});
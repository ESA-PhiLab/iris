/**
 * Tests for vars.just_logged_in migration to React store
 */

import { useSegmentationStore } from './segmentationStore';

describe('SegmentationStore - Just Logged In Migration', () => {
  beforeEach(() => {
    useSegmentationStore.getState().setJustLoggedIn(false);
  });

  it('should manage justLoggedIn state', () => {
    const { setJustLoggedIn } = useSegmentationStore.getState();
    
    expect(useSegmentationStore.getState().justLoggedIn).toBe(false);
    
    setJustLoggedIn(true);
    expect(useSegmentationStore.getState().justLoggedIn).toBe(true);
    
    setJustLoggedIn(false);
    expect(useSegmentationStore.getState().justLoggedIn).toBe(false);
  });

  it('should provide helper functions', () => {
    const w = window as any;
    
    w.setJustLoggedInInStore(true);
    expect(useSegmentationStore.getState().justLoggedIn).toBe(true);
    expect(w.getJustLoggedInFromStore()).toBe(true);
  });
});
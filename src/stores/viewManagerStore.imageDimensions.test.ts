/**
 * Tests for ViewManager Store Image Dimensions (vars.image_shape migration)
 * 
 * Focused test suite covering core functionality and critical integration points.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useViewManagerStore } from './viewManagerStore';

beforeEach(() => {
  // Reset store state
  useViewManagerStore.setState({
    imageDimensions: null,
    imageAspectRatio: 1,
    isInitialized: false,
    initializationError: null,
  });

  // Reset window mock
  (global.window as any).vars = { image_shape: null };
  
  // Clear console mocks
  vi.clearAllMocks();
});

describe('ViewManagerStore Image Dimensions', () => {
  describe('Core Functionality', () => {
    test('sets and retrieves image dimensions correctly', () => {
      const store = useViewManagerStore.getState();
      
      store.setImageDimensions(1024, 768);
      
      const state = useViewManagerStore.getState();
      expect(state.imageDimensions).toEqual({ width: 1024, height: 768 });
      expect(state.imageAspectRatio).toBeCloseTo(1024 / 768);
      expect(store.getImageShape()).toEqual([1024, 768]);
      expect(store.getImageAspectRatio()).toBeCloseTo(1024 / 768);
    });

    test('validates dimension input and rejects invalid values', () => {
      const store = useViewManagerStore.getState();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Test invalid inputs
      store.setImageDimensions(0, 100);
      store.setImageDimensions(-100, 100);
      store.setImageDimensions(NaN, 100);
      
      // State should remain unchanged
      const state = useViewManagerStore.getState();
      expect(state.imageDimensions).toBeNull();
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      
      consoleSpy.mockRestore();
    });

    test('handles null dimensions gracefully', () => {
      const store = useViewManagerStore.getState();
      
      expect(store.getImageShape()).toBeNull();
      expect(store.getImageAspectRatio()).toBe(1);
    });

    test('calculates aspect ratios for different image orientations', () => {
      const store = useViewManagerStore.getState();
      
      // Landscape
      store.setImageDimensions(1920, 1080);
      expect(store.getImageAspectRatio()).toBeCloseTo(16/9);
      
      // Portrait  
      store.setImageDimensions(600, 800);
      expect(store.getImageAspectRatio()).toBe(0.75);
      
      // Square
      store.setImageDimensions(512, 512);
      expect(store.getImageAspectRatio()).toBe(1);
    });
  });

  describe('Store Integration', () => {
    test('no longer syncs with legacy vars.image_shape (vars removed)', () => {
      const store = useViewManagerStore.getState();
      
      store.setImageDimensions(2048, 1536);
      
      // Verify store has the value - vars sync has been removed
      expect(useViewManagerStore.getState().imageDimensions).toEqual({ width: 2048, height: 1536 });
    });

    test('provides helper functions for legacy JavaScript access', () => {
      const store = useViewManagerStore.getState();
      store.setImageDimensions(1280, 720);
      
      // Test helper function patterns
      const getImageShapeFromStore = () => store.getImageShape();
      const getImageWidthFromStore = () => {
        const state = useViewManagerStore.getState();
        return state.imageDimensions ? state.imageDimensions.width : 0;
      };
      const getImageHeightFromStore = () => {
        const state = useViewManagerStore.getState();
        return state.imageDimensions ? state.imageDimensions.height : 0;
      };
      
      expect(getImageShapeFromStore()).toEqual([1280, 720]);
      expect(getImageWidthFromStore()).toBe(1280);
      expect(getImageHeightFromStore()).toBe(720);
    });
  });

  describe('ViewManager Integration', () => {
    test('integrates with calculateViewDimensions', () => {
      const store = useViewManagerStore.getState();
      
      // Set up mock views
      store.setViews({
        'rgb': { name: 'rgb', type: 'image', description: 'RGB composite' }
      });
      store.setViewGroups({ default: ['rgb'] });
      
      // Test with image dimensions
      store.setImageDimensions(1920, 1080);
      const [width, height] = store.calculateViewDimensions();
      expect(width / height).toBeCloseTo(16/9, 1);
      
      // Test fallback to imageAspectRatio
      useViewManagerStore.setState({ imageDimensions: null });
      store.setImageAspectRatio(4/3);
      const [width2, height2] = store.calculateViewDimensions();
      expect(width2 / height2).toBeCloseTo(4/3, 1);
    });

    test('initializes from legacy vars correctly', async () => {
      // Mock legacy vars
      (global.window as any).vars = {
        image_shape: [2048, 1536],
        config: {
          views: { rgb: { name: 'rgb', type: 'image' } },
          view_groups: { default: ['rgb'] }
        },
        image_id: 'test-image'
      };
      
      const store = useViewManagerStore.getState();
      await store.initializeFromLegacy();
      
      const state = useViewManagerStore.getState();
      expect(state.imageDimensions).toEqual({ width: 2048, height: 1536 });
      expect(state.imageAspectRatio).toBeCloseTo(2048 / 1536);
      expect(state.isInitialized).toBe(true);
    });

    test('handles missing image_shape during initialization', async () => {
      // Mock legacy vars without image_shape
      (global.window as any).vars = {
        config: {
          views: { rgb: { name: 'rgb', type: 'image' } },
          view_groups: { default: ['rgb'] }
        },
        image_id: 'test-image'
      };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const store = useViewManagerStore.getState();
      await store.initializeFromLegacy();
      
      const state = useViewManagerStore.getState();
      expect(state.imageDimensions).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ ViewManager: No image shape found in legacy vars');
      
      consoleSpy.mockRestore();
    });
  });
});
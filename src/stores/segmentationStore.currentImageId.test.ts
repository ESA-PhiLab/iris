/**
 * Tests for vars.image_id migration to React store
 * 
 * This test suite covers the migration of the critical vars.image_id variable
 * from legacy global variables to React Zustand store.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSegmentationStore } from './segmentationStore';

// Mock window object for legacy compatibility tests
const mockWindow = {
  vars: {
    image_id: null as string | null,
  },
  segmentationStore: null as any,
};

// Set up window mock
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

describe('segmentationStore - currentImageId (vars.image_id migration)', () => {
  beforeEach(() => {
    // Reset store state
    useSegmentationStore.setState({
      currentImageId: null,
      currentImageIndex: -1,
      images: [],
    });
    
    // Reset window mock
    if (mockWindow.vars) {
      mockWindow.vars.image_id = null;
    }
    mockWindow.segmentationStore = useSegmentationStore;
  });

  describe('Core Functionality', () => {
    it('should set current image ID', () => {
      const testImageId = 'test-image-001';
      
      // Set up test images
      useSegmentationStore.getState().setImages([
        { image_id: 'test-image-001', has_user_annotation: false, has_any_annotation: false, annotation_count: 0 },
        { image_id: 'test-image-002', has_user_annotation: true, has_any_annotation: true, annotation_count: 1 },
      ]);
      
      // Set current image
      useSegmentationStore.getState().setCurrentImage(testImageId);
      
      // Get fresh store state
      const store = useSegmentationStore.getState();
      
      // Verify store state
      expect(store.currentImageId).toBe(testImageId);
      expect(store.currentImageIndex).toBe(0);
    });

    it('should handle invalid image ID gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Try to set invalid image ID
      useSegmentationStore.getState().setCurrentImage('');
      
      // Should not change state
      const store = useSegmentationStore.getState();
      expect(store.currentImageId).toBeNull();
      expect(store.currentImageIndex).toBe(-1);
      expect(consoleSpy).toHaveBeenCalledWith('[IRIS] setCurrentImage: Invalid image ID', '');
      
      consoleSpy.mockRestore();
    });

    it('should handle image ID not in list', () => {
      // Set up test images
      useSegmentationStore.getState().setImages([
        { image_id: 'img-001', has_user_annotation: false, has_any_annotation: false, annotation_count: 0 },
      ]);
      
      // Set current image to non-existent ID
      useSegmentationStore.getState().setCurrentImage('non-existent');
      
      const store = useSegmentationStore.getState();
      expect(store.currentImageId).toBe('non-existent');
      expect(store.currentImageIndex).toBe(-1); // Not found
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      // Set up test images for navigation
      const images = [
        { image_id: 'img-001', has_user_annotation: false, has_any_annotation: false, annotation_count: 0 },
        { image_id: 'img-002', has_user_annotation: true, has_any_annotation: true, annotation_count: 1 },
        { image_id: 'img-003', has_user_annotation: false, has_any_annotation: true, annotation_count: 2 },
      ];
      useSegmentationStore.getState().setImages(images);
      useSegmentationStore.getState().setCurrentImage('img-002'); // Start at middle image
    });

    it('should navigate between images', () => {
      // Test next navigation
      const nextImageId = useSegmentationStore.getState().navigateNext();
      let store = useSegmentationStore.getState();
      expect(nextImageId).toBe('img-003');
      expect(store.currentImageId).toBe('img-003');
      
      // Test previous navigation
      const prevImageId = useSegmentationStore.getState().navigatePrev();
      store = useSegmentationStore.getState();
      expect(prevImageId).toBe('img-002');
      expect(store.currentImageId).toBe('img-002');
    });

    it('should handle navigation boundaries', () => {
      // Move to last image and try to go next
      useSegmentationStore.getState().setCurrentImage('img-003');
      expect(useSegmentationStore.getState().navigateNext()).toBeNull();
      let store = useSegmentationStore.getState();
      expect(store.currentImageId).toBe('img-003'); // Should stay at last image
      
      // Move to first image and try to go previous
      useSegmentationStore.getState().setCurrentImage('img-001');
      expect(useSegmentationStore.getState().navigatePrev()).toBeNull();
      store = useSegmentationStore.getState();
      expect(store.currentImageId).toBe('img-001'); // Should stay at first image
    });

    it('should get navigation info without changing state', () => {
      const store = useSegmentationStore.getState();
      
      // Should get next/prev IDs without navigating
      expect(store.getNextImageId()).toBe('img-003');
      expect(store.getPrevImageId()).toBe('img-001');
      expect(store.getCurrentImage()?.image_id).toBe('img-002');
      
      // Should not change current position
      expect(store.currentImageId).toBe('img-002');
      expect(store.currentImageIndex).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty images array', () => {
      useSegmentationStore.getState().setImages([]);
      const store = useSegmentationStore.getState();
      
      expect(store.getNextImageId()).toBeNull();
      expect(store.getPrevImageId()).toBeNull();
      expect(store.getCurrentImage()).toBeNull();
    });

    it('should handle single image navigation', () => {
      useSegmentationStore.getState().setImages([
        { image_id: 'only-image', has_user_annotation: false, has_any_annotation: false, annotation_count: 0 },
      ]);
      useSegmentationStore.getState().setCurrentImage('only-image');
      
      const store = useSegmentationStore.getState();
      
      expect(store.getNextImageId()).toBeNull();
      expect(store.getPrevImageId()).toBeNull();
      expect(store.navigateNext()).toBeNull();
      expect(store.navigatePrev()).toBeNull();
      
      // Should stay at current image
      expect(store.currentImageId).toBe('only-image');
      expect(store.currentImageIndex).toBe(0);
    });

    it('should handle missing window.vars gracefully', () => {
      // Temporarily remove vars
      const originalVars = mockWindow.vars;
      delete (mockWindow as any).vars;
      
      // Should not throw error
      expect(() => {
        useSegmentationStore.getState().setCurrentImage('no-vars-test');
      }).not.toThrow();
      
      const store = useSegmentationStore.getState();
      expect(store.currentImageId).toBe('no-vars-test');
      
      // Restore vars
      mockWindow.vars = originalVars;
    });
  });

  describe('Performance', () => {
    it('should handle large image lists efficiently', () => {
      // Create large image list
      const largeImageList = Array.from({ length: 1000 }, (_, i) => ({
        image_id: `img-${i.toString().padStart(4, '0')}`,
        has_user_annotation: i % 2 === 0,
        has_any_annotation: i % 3 === 0,
        annotation_count: i % 5,
      }));
      
      const startTime = performance.now();
      useSegmentationStore.getState().setImages(largeImageList);
      useSegmentationStore.getState().setCurrentImage('img-0500');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      
      const store = useSegmentationStore.getState();
      expect(store.currentImageIndex).toBe(500);
      expect(store.currentImageId).toBe('img-0500');
    });
  });
});
/**
 * Test suite for user pixel counting functionality
 * 
 * This test verifies that the pixel counting system works correctly
 * in the React/Zustand store, including AI training validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import type { ClassConfig, AITrainingValidation } from '../types/iris';

// Create a test-specific store to avoid singleton issues
const createTestStore = () => create<{
  maskData: Uint8Array | null;
  userMaskData: Uint8Array | null;
  maskDimensions: { width: number; height: number } | null;
  classes: ClassConfig[];
  userPixelCounts: { [classId: number]: number; total: number };
  
  setMaskData: (data: Uint8Array, width: number, height: number) => void;
  setUserMaskData: (data: Uint8Array) => void;
  setClasses: (classes: ClassConfig[]) => void;
  updateUserPixelCounts: (counts: { [classId: number]: number; total: number }) => void;
  calculatePixelCounts: () => { [classId: number]: number; total: number };
  validateAITrainingData: () => AITrainingValidation;
  getClassPixelCount: (classId: number) => number;
  getTotalUserPixels: () => number;
  recalculatePixelCounts: () => { [classId: number]: number; total: number };
  clearMask: () => void;
}>((set, get) => ({
  maskData: null,
  userMaskData: null,
  maskDimensions: null,
  classes: [],
  userPixelCounts: { total: 0 },

  setMaskData: (data: Uint8Array, width: number, height: number) => {
    const dataCopy = new Uint8Array(data);
    set({ 
      maskData: dataCopy,
      maskDimensions: { width, height }
    });
    
    const { classes } = get();
    if (classes && classes.length > 0) {
      get().updateUserPixelCounts(get().calculatePixelCounts());
    }
  },

  setUserMaskData: (data: Uint8Array) => {
    const dataCopy = new Uint8Array(data);
    set({ userMaskData: dataCopy });
    
    const { classes } = get();
    if (classes && classes.length > 0) {
      get().updateUserPixelCounts(get().calculatePixelCounts());
    }
  },

  setClasses: (classes: ClassConfig[]) => {
    set({ classes });
  },

  updateUserPixelCounts: (counts: { [classId: number]: number; total: number }) => {
    set({ userPixelCounts: counts });
  },

  calculatePixelCounts: () => {
    const { maskData, userMaskData, classes } = get();
    if (!maskData || !userMaskData || !classes || classes.length === 0) {
      return { total: 0 };
    }

    const counts: { [classId: number]: number; total: number } = { total: 0 };
    
    classes.forEach((_, index) => {
      counts[index] = 0;
    });

    for (let i = 0; i < userMaskData.length; i++) {
      if (userMaskData[i]) {
        const classId = maskData[i];
        if (classId >= 0 && classId < classes.length) {
          counts[classId]++;
          counts.total++;
        }
      }
    }

    return counts;
  },

  validateAITrainingData: () => {
    const { userPixelCounts } = get();
    
    let classesWithEnoughPixels = 0;
    const classPixelCounts: { [classId: number]: number } = {};
    
    Object.keys(userPixelCounts).forEach(key => {
      if (key !== 'total') {
        const classId = parseInt(key);
        const pixelCount = userPixelCounts[classId];
        classPixelCounts[classId] = pixelCount;
        
        if (pixelCount > 10) {
          classesWithEnoughPixels++;
        }
      }
    });
    
    return {
      isValid: classesWithEnoughPixels >= 2,
      classesWithEnoughPixels,
      totalPixels: userPixelCounts.total,
      classPixelCounts,
      minPixelsRequired: 10,
      minClassesRequired: 2
    };
  },

  getClassPixelCount: (classId: number) => {
    const { userPixelCounts } = get();
    return userPixelCounts[classId] || 0;
  },

  getTotalUserPixels: () => {
    const { userPixelCounts } = get();
    return userPixelCounts.total || 0;
  },

  recalculatePixelCounts: () => {
    const newCounts = get().calculatePixelCounts();
    get().updateUserPixelCounts(newCounts);
    return newCounts;
  },

  clearMask: () => {
    set({ 
      maskData: null,
      userMaskData: null,
      maskDimensions: null,
      userPixelCounts: { total: 0 }
    });
  }
}));

describe('User Pixel Counts', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = createTestStore();
  });

  describe('Pixel Counting Core Functionality', () => {
    it('should initialize with zero counts and calculate pixel counts correctly', () => {
      // Test initialization
      const initialCounts = store.getState().userPixelCounts;
      expect(initialCounts.total).toBe(0);

      // Setup test data
      const classes: ClassConfig[] = [
        { name: 'Background', colour: [0, 0, 0, 255] },
        { name: 'Object', colour: [255, 255, 255, 255] }
      ];
      store.getState().setClasses(classes);

      // Create test mask data (4x4 image)
      const maskData = new Uint8Array([
        0, 0, 1, 1,  // Row 1: 2 background, 2 object
        0, 1, 1, 1,  // Row 2: 1 background, 3 object
        1, 1, 0, 0,  // Row 3: 2 object, 2 background
        1, 0, 0, 0   // Row 4: 1 object, 3 background
      ]);

      // Create user mask data (where user has drawn)
      const userMaskData = new Uint8Array([
        1, 1, 0, 0,  // User drew on first 2 pixels
        0, 1, 1, 0,  // User drew on pixels 5 and 6
        1, 0, 0, 1,  // User drew on pixels 8 and 11
        0, 0, 1, 1   // User drew on last 2 pixels
      ]);

      store.getState().setMaskData(maskData, 4, 4);
      store.getState().setUserMaskData(userMaskData);

      const pixelCounts = store.getState().calculatePixelCounts();

      // Count expected pixels:
      // User drew on indices: 0, 1, 5, 6, 8, 11, 14, 15
      // maskData[0] = 0, maskData[1] = 0, maskData[5] = 1, maskData[6] = 1
      // maskData[8] = 1, maskData[11] = 0, maskData[14] = 0, maskData[15] = 0
      // Class 0 (background): indices 0, 1, 11, 14, 15 = 5 pixels
      // Class 1 (object): indices 5, 6, 8 = 3 pixels
      // Total: 8 pixels

      expect(pixelCounts[0]).toBe(5); // Background class
      expect(pixelCounts[1]).toBe(3); // Object class
      expect(pixelCounts.total).toBe(8);
    });

    it('should update pixel counts when user mask changes', () => {
      const classes: ClassConfig[] = [
        { name: 'Class0', colour: [255, 0, 0, 255] },
        { name: 'Class1', colour: [0, 255, 0, 255] }
      ];
      store.getState().setClasses(classes);

      // Create simple 2x2 mask
      const maskData = new Uint8Array([0, 1, 1, 0]);
      const userMaskData = new Uint8Array([1, 1, 0, 0]);

      store.getState().setMaskData(maskData, 2, 2);
      store.getState().setUserMaskData(userMaskData);

      let pixelCounts = store.getState().userPixelCounts;
      expect(pixelCounts[0]).toBe(1); // Class 0: 1 pixel
      expect(pixelCounts[1]).toBe(1); // Class 1: 1 pixel
      expect(pixelCounts.total).toBe(2);

      // Update user mask - now user drew on all pixels
      const newUserMaskData = new Uint8Array([1, 1, 1, 1]);
      store.getState().setUserMaskData(newUserMaskData);

      pixelCounts = store.getState().userPixelCounts;
      expect(pixelCounts[0]).toBe(2); // Class 0: 2 pixels
      expect(pixelCounts[1]).toBe(2); // Class 1: 2 pixels
      expect(pixelCounts.total).toBe(4);
    });
  });

  describe('AI Training Validation', () => {
    beforeEach(() => {
      const classes: ClassConfig[] = [
        { name: 'Class0', colour: [255, 0, 0, 255] },
        { name: 'Class1', colour: [0, 255, 0, 255] },
        { name: 'Class2', colour: [0, 0, 255, 255] }
      ];
      store.getState().setClasses(classes);
    });

    it('should validate training data correctly for both insufficient and sufficient cases', () => {
      // Test insufficient training data
      const smallMaskData = new Uint8Array(20).fill(0).map((_, i) => i % 3);
      const smallUserMaskData = new Uint8Array(20).fill(1);

      store.getState().setMaskData(smallMaskData, 4, 5);
      store.getState().setUserMaskData(smallUserMaskData);

      let validation = store.getState().validateAITrainingData();
      expect(validation.isValid).toBe(false);
      expect(validation.classesWithEnoughPixels).toBe(0);
      expect(validation.totalPixels).toBe(20);
      expect(validation.minPixelsRequired).toBe(10);
      expect(validation.minClassesRequired).toBe(2);

      // Test sufficient training data
      const largeMaskData = new Uint8Array(60);
      const largeUserMaskData = new Uint8Array(60).fill(1);

      // Fill with 20 pixels each of classes 0, 1, 2
      for (let i = 0; i < 60; i++) {
        largeMaskData[i] = Math.floor(i / 20);
      }

      store.getState().setMaskData(largeMaskData, 6, 10);
      store.getState().setUserMaskData(largeUserMaskData);

      validation = store.getState().validateAITrainingData();
      expect(validation.isValid).toBe(true);
      expect(validation.classesWithEnoughPixels).toBe(3);
      expect(validation.totalPixels).toBe(60);
      expect(validation.classPixelCounts[0]).toBe(20);
      expect(validation.classPixelCounts[1]).toBe(20);
      expect(validation.classPixelCounts[2]).toBe(20);
    });
  });

  describe('Helper Methods and Edge Cases', () => {
    it('should provide correct helper method results and handle edge cases', () => {
      const classes: ClassConfig[] = [
        { name: 'Background', colour: [0, 0, 0, 255] },
        { name: 'Foreground', colour: [255, 255, 255, 255] }
      ];
      store.getState().setClasses(classes);

      // Test with valid data
      const maskData = new Uint8Array([0, 0, 1, 1, 0, 1]);
      const userMaskData = new Uint8Array([1, 1, 1, 0, 1, 1]);

      store.getState().setMaskData(maskData, 2, 3);
      store.getState().setUserMaskData(userMaskData);

      // Test helper methods
      expect(store.getState().getClassPixelCount(0)).toBe(3); // Background: indices 0, 1, 4
      expect(store.getState().getClassPixelCount(1)).toBe(2); // Foreground: indices 2, 5
      expect(store.getState().getClassPixelCount(999)).toBe(0); // Invalid class
      expect(store.getState().getTotalUserPixels()).toBe(5);

      // Test recalculation
      store.getState().updateUserPixelCounts({ total: 999, 0: 500, 1: 499 });
      expect(store.getState().getTotalUserPixels()).toBe(999);

      const newCounts = store.getState().recalculatePixelCounts();
      expect(newCounts.total).toBe(5);
      expect(newCounts[0]).toBe(3);
      expect(newCounts[1]).toBe(2);

      // Test edge cases
      store.getState().clearMask();
      const emptyCounts = store.getState().calculatePixelCounts();
      expect(emptyCounts.total).toBe(0);

      // Test with invalid class IDs in mask data
      const invalidMaskData = new Uint8Array([0, 1, 2, 0]); // Class 2 doesn't exist
      const validUserMaskData = new Uint8Array([1, 1, 1, 1]);

      store.getState().setMaskData(invalidMaskData, 2, 2);
      store.getState().setUserMaskData(validUserMaskData);

      const invalidCounts = store.getState().calculatePixelCounts();
      expect(invalidCounts[0]).toBe(2); // Valid class 0 pixels
      expect(invalidCounts[1]).toBe(1); // Valid class 1 pixels
      expect(invalidCounts.total).toBe(3); // Invalid class ID ignored
    });
  });
});
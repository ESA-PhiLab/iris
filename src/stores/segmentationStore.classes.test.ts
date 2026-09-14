/**
 * Tests for vars.classes migration to segmentationStore.classes
 * 
 * This test suite ensures that the classes migration is working correctly,
 * with React store as primary source and legacy vars as fallback.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useSegmentationStore, getClassFromStore, getClassNameFromStore, getClassCountFromStore } from './segmentationStore';

// Define the ClassConfig interface for the test
interface ClassConfig {
  name: string;
  colour: [number, number, number, number];
  user_colour?: [number, number, number, number];
  description?: string;
}

// Mock window object for legacy compatibility
const mockWindow = {
  vars: {
    classes: [] as ClassConfig[],
    current_class: 0,
    config: {
      classes: [] as ClassConfig[]
    }
  },
  getClassFromStore: vi.fn(),
  getClassNameFromStore: vi.fn(),
  getClassCountFromStore: vi.fn(),
  setClassesInStore: vi.fn(),
  getCurrentClassFromStore: vi.fn(),
  setCurrentClassInStore: vi.fn()
};

// Setup window mock
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

describe('segmentationStore.classes migration', () => {
  beforeEach(() => {
    // Reset mocks first
    vi.clearAllMocks();
    
    // Reset mock window vars
    mockWindow.vars.classes = [] as ClassConfig[];
    mockWindow.vars.current_class = 0;
    
    // Get fresh store state and reset all relevant properties
    const store = useSegmentationStore.getState();
    
    // Reset classes and current class in the correct order
    // First set classes to empty array
    store.setClasses([]);
    
    // Then reset current class (this will work since classes array is empty)
    store.setCurrentClass(0);
    
    // Reset any other state that might interfere
    store.updateUserPixelCounts({ total: 0 });
  });

  describe('setClasses', () => {
    test('sets classes array correctly', () => {
      const testClasses = [
        { name: 'cloud', colour: [255, 255, 255, 255] as [number, number, number, number] },
        { name: 'shadow', colour: [0, 0, 0, 255] as [number, number, number, number] }
      ];

      const store = useSegmentationStore.getState();
      store.setClasses(testClasses);
      
      const updatedStore = useSegmentationStore.getState();

      expect(updatedStore.classes).toEqual(testClasses);
    });

    test('updates currentClass when out of bounds', () => {
      const store = useSegmentationStore.getState();
      
      // Set current class to 2 when no classes are loaded
      store.setCurrentClass(2);
      const storeAfterSetClass = useSegmentationStore.getState();
      expect(storeAfterSetClass.currentClass).toBe(2);
      
      // Set classes array with only 2 classes (indices 0, 1)
      const testClasses = [
        { name: 'class0', colour: [255, 0, 0, 255] as [number, number, number, number] },
        { name: 'class1', colour: [0, 255, 0, 255] as [number, number, number, number] }
      ];
      
      store.setClasses(testClasses);
      
      const updatedStore = useSegmentationStore.getState();
      
      // Current class should be reset to 0 since 2 is out of bounds
      expect(updatedStore.currentClass).toBe(0);
    });
  });

  describe('helper functions', () => {
    beforeEach(() => {
      const testClasses = [
        { name: 'cloud', colour: [255, 255, 255, 255] as [number, number, number, number] },
        { name: 'shadow', colour: [0, 0, 0, 255] as [number, number, number, number] },
        { name: 'clear', colour: [0, 255, 0, 255] as [number, number, number, number] }
      ];
      
      const store = useSegmentationStore.getState();
      store.setClasses(testClasses);
    });

    test('getClassFromStore returns individual class by ID with bounds checking', () => {
      const class0 = getClassFromStore(0);
      expect(class0?.name).toBe('cloud');
      expect(class0?.colour).toEqual([255, 255, 255, 255]);
      
      const invalidClass = getClassFromStore(10);
      expect(invalidClass).toBeNull();
    });

    test('getClassNameFromStore returns class names with fallback', () => {
      const name0 = getClassNameFromStore(0);
      expect(name0).toBe('cloud');
      
      const invalidName = getClassNameFromStore(10);
      expect(invalidName).toBe('Class 10');
    });

    test('getClassCountFromStore returns correct count', () => {
      const count = getClassCountFromStore();
      expect(count).toBe(3);
      
      // Test with empty classes
      const store = useSegmentationStore.getState();
      store.setClasses([]);
      
      const emptyCount = getClassCountFromStore();
      expect(emptyCount).toBe(0);
    });
  });

  describe('currentClass integration', () => {
    test('setCurrentClass validates against classes array', () => {
      const testClasses = [
        { name: 'class0', colour: [255, 0, 0, 255] as [number, number, number, number] },
        { name: 'class1', colour: [0, 255, 0, 255] as [number, number, number, number] }
      ];
      
      const store = useSegmentationStore.getState();
      store.setClasses(testClasses);
      
      // Valid class ID
      store.setCurrentClass(1);
      const storeAfterValid = useSegmentationStore.getState();
      expect(storeAfterValid.currentClass).toBe(1);
      
      // Invalid class ID (out of bounds) - should remain unchanged
      store.setCurrentClass(5);
      const storeAfterInvalid = useSegmentationStore.getState();
      expect(storeAfterInvalid.currentClass).toBe(1);
    });
  });
});
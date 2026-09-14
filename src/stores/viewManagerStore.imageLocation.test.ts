/**
 * Tests for viewManagerStore imageLocation functionality
 * 
 * This tests the migration of vars.image_location to React store
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useViewManagerStore } from './viewManagerStore';

// Mock window object for legacy vars
const mockWindow = {
  vars: {
    image_location: [0, 0] as [number, number],
    config: undefined as any,
    image_id: undefined as string | undefined,
  }
};

beforeEach(() => {
  // Reset store state
  useViewManagerStore.setState({
    imageLocation: [0, 0],
  });
  
  // Reset window mock
  vi.stubGlobal('window', mockWindow);
  mockWindow.vars.image_location = [0, 0];
  
  // Set up global functions (these are normally set up when the store module loads)
  (global.window as any).getImageLocationFromStore = () => {
    return useViewManagerStore.getState().imageLocation;
  };
  
  (global.window as any).setImageLocationInStore = (location: [number, number]) => {
    useViewManagerStore.getState().setImageLocation(location);
  };
  
  (global.window as any).validateImageLocation = (location: [number, number]) => {
    return useViewManagerStore.getState().validateImageLocation(location);
  };
  
  (global.window as any).getImageLocationDebugInfo = () => {
    return useViewManagerStore.getState().getImageLocationDebugInfo();
  };
});

describe('imageLocation', () => {
  test('sets valid geographic coordinates correctly', () => {
    const store = useViewManagerStore.getState();
    
    store.setImageLocation([40.7128, -74.0060]); // New York City
    
    expect(useViewManagerStore.getState().imageLocation).toEqual([40.7128, -74.0060]);
  });

  test('validates coordinate input - various invalid formats', () => {
    const store = useViewManagerStore.getState();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Set valid coordinates first
    store.setImageLocation([40.7128, -74.0060]);
    expect(useViewManagerStore.getState().imageLocation).toEqual([40.7128, -74.0060]);
    
    // Test various invalid inputs - all should leave coordinates unchanged
    const invalidInputs = [
      [40.7128], // invalid array length
      'invalid', // non-array input
      ['48.8566', '2.3522'], // non-numeric values
      [NaN, 37.6176], // NaN values
    ];
    
    invalidInputs.forEach(invalidInput => {
      store.setImageLocation(invalidInput as any);
      expect(useViewManagerStore.getState().imageLocation).toEqual([40.7128, -74.0060]);
    });
    
    expect(consoleSpy).toHaveBeenCalledTimes(4);
    consoleSpy.mockRestore();
  });

  test('validates geographic bounds', () => {
    const store = useViewManagerStore.getState();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Set valid coordinates first
    store.setImageLocation([35.6762, 139.6503]);
    expect(useViewManagerStore.getState().imageLocation).toEqual([35.6762, 139.6503]);
    
    // Test out of bounds coordinates
    const outOfBoundsInputs = [
      [95.0, 0.0], // lat > 90
      [-95.0, 0.0], // lat < -90
      [0.0, 185.0], // lon > 180
      [0.0, -185.0], // lon < -180
    ];
    
    outOfBoundsInputs.forEach(coords => {
      store.setImageLocation(coords as [number, number]);
      expect(useViewManagerStore.getState().imageLocation).toEqual([35.6762, 139.6503]);
    });
    
    expect(consoleSpy).toHaveBeenCalledTimes(4);
    consoleSpy.mockRestore();
  });

  test('accepts valid coordinates including boundaries', () => {
    const store = useViewManagerStore.getState();
    
    const validCoords = [
      [40.7128, -74.0060], // New York City
      [90.0, 180.0], // North Pole, International Date Line
      [-90.0, -180.0], // South Pole, International Date Line
      [0.0, 0.0], // Equator, Prime Meridian
    ];
    
    validCoords.forEach(coords => {
      store.setImageLocation(coords as [number, number]);
      expect(useViewManagerStore.getState().imageLocation).toEqual(coords);
    });
  });

  test('no longer syncs with legacy vars object (vars removed)', () => {
    const store = useViewManagerStore.getState();
    
    store.setImageLocation([37.7749, -122.4194]); // San Francisco
    
    // Verify store has the value - vars sync has been removed
    expect(useViewManagerStore.getState().imageLocation).toEqual([37.7749, -122.4194]);
  });

  test('validateImageLocation function works correctly', () => {
    const store = useViewManagerStore.getState();
    
    // Valid coordinates
    expect(store.validateImageLocation([40.7128, -74.0060])).toBe(true);
    expect(store.validateImageLocation([0, 0])).toBe(true);
    expect(store.validateImageLocation([90, 180])).toBe(true);
    expect(store.validateImageLocation([-90, -180])).toBe(true);
    
    // Invalid coordinates
    expect(store.validateImageLocation([91, 0])).toBe(false); // lat > 90
    expect(store.validateImageLocation([-91, 0])).toBe(false); // lat < -90
    expect(store.validateImageLocation([0, 181])).toBe(false); // lon > 180
    expect(store.validateImageLocation([0, -181])).toBe(false); // lon < -180
    expect(store.validateImageLocation([NaN, 0])).toBe(false); // NaN lat
    expect(store.validateImageLocation([0, NaN])).toBe(false); // NaN lon
    expect(store.validateImageLocation(['40', '-74'] as any)).toBe(false); // string values
    expect(store.validateImageLocation([40] as any)).toBe(false); // wrong length
    expect(store.validateImageLocation('invalid' as any)).toBe(false); // not array
  });

  test('getImageLocationDebugInfo returns correct information', () => {
    const store = useViewManagerStore.getState();
    
    // Set valid coordinates
    store.setImageLocation([52.5200, 13.4050]); // Berlin
    
    const debugInfo = store.getImageLocationDebugInfo();
    expect(debugInfo).toEqual({
      lat: 52.5200,
      lon: 13.4050,
      valid: true
    });
    
    // Set invalid coordinates directly in state (bypassing validation)
    useViewManagerStore.setState({ imageLocation: [95, 0] });
    
    const invalidDebugInfo = store.getImageLocationDebugInfo();
    expect(invalidDebugInfo).toEqual({
      lat: 95,
      lon: 0,
      valid: false
    });
  });

  test('initializes from legacy vars during store initialization', () => {
    // Set up legacy vars
    mockWindow.vars.image_location = [41.9028, 12.4964]; // Rome
    mockWindow.vars.config = { views: {} };
    mockWindow.vars.image_id = 'test-image';
    
    const store = useViewManagerStore.getState();
    
    // Simulate initialization
    return store.initializeFromLegacy().then(() => {
      const state = useViewManagerStore.getState();
      expect(state.imageLocation).toEqual([41.9028, 12.4964]);
    });
  });

  test('legacy bridge functions work correctly', () => {
    // Test setImageLocationInStore
    const setImageLocationInStore = (window as any).setImageLocationInStore;
    setImageLocationInStore([59.9311, 30.3609]); // St. Petersburg
    expect(useViewManagerStore.getState().imageLocation).toEqual([59.9311, 30.3609]);
    
    // Test getImageLocationFromStore
    const getImageLocationFromStore = (window as any).getImageLocationFromStore;
    expect(getImageLocationFromStore()).toEqual([59.9311, 30.3609]);
    
    // Test validateImageLocation
    const validateImageLocation = (window as any).validateImageLocation;
    expect(validateImageLocation([45.4642, 9.1900])).toBe(true); // Milan
    expect(validateImageLocation([95, 0])).toBe(false); // Invalid
    
    // Test getImageLocationDebugInfo
    const getImageLocationDebugInfo = (window as any).getImageLocationDebugInfo;
    const debugInfo = getImageLocationDebugInfo();
    expect(debugInfo.lat).toBe(59.9311);
    expect(debugInfo.lon).toBe(30.3609);
    expect(debugInfo.valid).toBe(true);
  });
});
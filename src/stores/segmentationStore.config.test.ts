/**
 * Comprehensive test suite for vars.config migration to React store
 * 
 * Tests all config-related functionality including:
 * - Config loading and validation
 * - Section access and updates
 * - Integration with legacy JavaScript
 * - Helper functions
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSegmentationStore } from './segmentationStore';
import type { ProjectConfig, ClassConfig } from '../types/iris';

// Mock window object for testing
const mockWindow = {
  vars: {
    config: null,
    classes: null,
    mask_area: null
  },
  setClassesInStore: vi.fn(),
  setMaskAreaInStore: vi.fn()
};

// Setup window mock
beforeEach(() => {
  vi.stubGlobal('window', mockWindow);
  
  // Reset mocks
  mockWindow.setClassesInStore.mockClear();
  mockWindow.setMaskAreaInStore.mockClear();
  
  // Reset store state directly - use getState() and setState() properly
  const store = useSegmentationStore.getState();
  useSegmentationStore.setState({
    ...store,
    config: null,
    classes: [],
    maskArea: null
  });
});

// Test data
const validConfig: ProjectConfig = {
  name: "test-project",
  host: "localhost",
  port: 5000,
  images: "/path/to/images",
  classes: [
    {
      name: "Clear",
      colour: [255, 255, 255, 0] as [number, number, number, number],
      description: "Clear pixels"
    },
    {
      name: "Cloud",
      colour: [255, 255, 0, 70] as [number, number, number, number],
      description: "Cloud pixels"
    }
  ],
  views: {
    "RGB": {
      name: "RGB",
      type: "image",
      bands: ["$B4", "$B3", "$B2"]
    },
    "NDVI": {
      name: "NDVI", 
      type: "image",
      expression: "($B8 - $B4) / ($B8 + $B4)",
      colormap: "RdYlGn"
    }
  },
  view_groups: {
    "default": ["RGB", "NDVI"]
  },
  segmentation: {
    mask_path: "/path/to/masks",
    mask_area: [64, 64, 448, 448] as [number, number, number, number],
    ai_model: {
      n_estimators: 100,
      max_depth: 10,
      n_leaves: 31,
      train_ratio: 0.8,
      max_train_pixels: 10000,
      use_edge_filter: true,
      use_meshgrid: true,
      meshgrid_cells: "8x8",
      use_superpixels: false,
      bands: ["B2", "B3", "B4"],
      suppression_filter_size: 3,
      suppression_threshold: 0.5,
      suppression_default_class: 0
    },
    scoring: {
      enabled: true,
      metrics: ["f1_score", "jaccard_index"]
    }
  }
};

describe('Config State Management', () => {
  it('should initialize with null config', () => {
    const store = useSegmentationStore.getState();
    expect(store.config).toBeNull();
  });

  it('should set valid config successfully', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    // Get fresh state reference after setConfig
    const updatedStore = useSegmentationStore.getState();
    expect(updatedStore.config).toEqual(validConfig);
  });

  it('should reject invalid config', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test with invalid config (missing required fields)
    const invalidConfig = { name: "test" } as any;
    store.setConfig(invalidConfig);
    
    expect(store.config).toBeNull();
    // Check that setConfig logged an error (it should be called after validation fails)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[IRIS] setConfig: Invalid config structure'),
      expect.anything()
    );
    
    consoleSpy.mockRestore();
  });

  it('should sync related data when setting config', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    expect(mockWindow.setClassesInStore).toHaveBeenCalledWith(validConfig.classes);
    expect(mockWindow.setMaskAreaInStore).toHaveBeenCalledWith(validConfig.segmentation.mask_area);
  });
});

describe('Config Validation', () => {
  it('should validate complete valid config', () => {
    const store = useSegmentationStore.getState();
    expect(store.validateConfig(validConfig)).toBe(true);
  });

  it('should reject config with missing required fields', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const incompleteConfig = { ...validConfig };
    delete (incompleteConfig as any).name;
    
    expect(store.validateConfig(incompleteConfig as any)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing required field: name')
    );
    
    consoleSpy.mockRestore();
  });

  it('should reject config with invalid name', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const invalidConfig = { ...validConfig, name: "" };
    
    expect(store.validateConfig(invalidConfig)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid name')
    );
    
    consoleSpy.mockRestore();
  });

  it('should reject config with invalid port', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const invalidConfig = { ...validConfig, port: -1 };
    
    expect(store.validateConfig(invalidConfig)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid port')
    );
    
    consoleSpy.mockRestore();
  });

  it('should reject config with invalid classes', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const invalidConfig = {
      ...validConfig,
      classes: [
        { name: "", colour: [255, 255, 255, 0] as [number, number, number, number] } // Invalid: empty name
      ]
    };
    
    expect(store.validateConfig(invalidConfig)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid class name at index 0')
    );
    
    consoleSpy.mockRestore();
  });

  it('should reject config with invalid class colors', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const invalidConfig = {
      ...validConfig,
      classes: [
        { name: "Test", colour: [300, 255, 255, 0] as [number, number, number, number] } // Invalid: color value > 255
      ]
    };
    
    expect(store.validateConfig(invalidConfig)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid colour value at index 0, values must be 0-255')
    );
    
    consoleSpy.mockRestore();
  });

  it('should reject config with invalid views', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const invalidConfig = {
      ...validConfig,
      views: {} // Invalid: empty views object
    };
    
    expect(store.validateConfig(invalidConfig)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Views object is empty")
    );
    
    consoleSpy.mockRestore();
  });

  it('should reject config with invalid AI model', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const invalidConfig = {
      ...validConfig,
      segmentation: {
        ...validConfig.segmentation,
        ai_model: {
          ...validConfig.segmentation.ai_model,
          n_estimators: "invalid" // Should be number
        }
      }
    };
    
    expect(store.validateConfig(invalidConfig as any)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid AI model field: n_estimators')
    );
    
    consoleSpy.mockRestore();
  });
});

describe('Config Section Access', () => {
  beforeEach(() => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
  });

  it('should get config section successfully', () => {
    const store = useSegmentationStore.getState();
    
    expect(store.getConfigSection('name')).toBe('test-project');
    expect(store.getConfigSection('classes')).toEqual(validConfig.classes);
    expect(store.getConfigSection('views')).toEqual(validConfig.views);
    expect(store.getConfigSection('segmentation')).toEqual(validConfig.segmentation);
  });

  it('should return null for section when no config loaded', () => {
    // Directly set config to null using setState (bypassing validation)
    useSegmentationStore.setState({ config: null });
    
    const store = useSegmentationStore.getState();
    expect(store.getConfigSection('name')).toBeNull();
    expect(store.getConfigSection('classes')).toBeNull();
  });

  it('should update config section successfully', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    const newClasses: ClassConfig[] = [
      { name: "New Class", colour: [0, 255, 0, 100] as [number, number, number, number] }
    ];
    
    store.updateConfigSection('classes', newClasses);
    
    // Get fresh state after update
    const updatedStore = useSegmentationStore.getState();
    expect(updatedStore.config?.classes).toEqual(newClasses);
    expect(mockWindow.setClassesInStore).toHaveBeenCalledWith(newClasses);
  });

  it('should reject invalid section update', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Try to update with invalid classes
    const invalidClasses = [
      { name: "", colour: [255, 255, 255, 0] as [number, number, number, number] } // Invalid: empty name
    ];
    
    store.updateConfigSection('classes', invalidClasses as any);
    
    // Config should remain unchanged
    expect(store.config?.classes).toEqual(validConfig.classes);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[IRIS] updateConfigSection: Invalid config after update'),
      expect.anything()
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle section update when no config loaded', () => {
    // Ensure store starts with no config
    useSegmentationStore.setState({ config: null });
    
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    store.updateConfigSection('name', 'new-name');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No config available to update')
    );
    
    consoleSpy.mockRestore();
  });
});

describe('Config Debug Info', () => {
  it('should return correct debug info when config loaded', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    const debugInfo = store.getConfigDebugInfo();
    
    expect(debugInfo).toEqual({
      loaded: true,
      sections: expect.arrayContaining(['name', 'classes', 'views', 'segmentation']),
      valid: true,
      hasClasses: 2,
      hasViews: 2,
      hasViewGroups: 1,
      hasSegmentation: true,
      hasAIModel: true
    });
  });

  it('should return correct debug info when no config loaded', () => {
    const store = useSegmentationStore.getState();
    
    const debugInfo = store.getConfigDebugInfo();
    
    expect(debugInfo).toEqual({
      loaded: false,
      sections: [],
      valid: false,
      hasClasses: 0,
      hasViews: 0,
      hasViewGroups: 0,
      hasSegmentation: false,
      hasAIModel: false
    });
  });
});

describe('Legacy JavaScript Integration', () => {
  beforeEach(() => {
    // Setup window helper functions
    (window as any).getConfigFromStore = () => useSegmentationStore.getState().config;
    (window as any).setConfigInStore = (config: ProjectConfig) => {
      const store = useSegmentationStore.getState();
      if (store.validateConfig(config)) {
        store.setConfig(config);
      }
    };
    (window as any).getConfigSectionFromStore = (section: keyof ProjectConfig) => 
      useSegmentationStore.getState().getConfigSection(section);
    (window as any).updateConfigSectionInStore = (section: keyof ProjectConfig, data: any) =>
      useSegmentationStore.getState().updateConfigSection(section, data);
    (window as any).validateConfigFromStore = () => {
      const config = useSegmentationStore.getState().config;
      return config ? useSegmentationStore.getState().validateConfig(config) : false;
    };
    (window as any).getConfigDebugInfoFromStore = () =>
      useSegmentationStore.getState().getConfigDebugInfo();
  });

  it('should provide getConfigFromStore helper', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    const config = (window as any).getConfigFromStore();
    expect(config).toEqual(validConfig);
  });

  it('should provide setConfigInStore helper', () => {
    (window as any).setConfigInStore(validConfig);
    
    const store = useSegmentationStore.getState();
    expect(store.config).toEqual(validConfig);
  });

  it('should provide getConfigSectionFromStore helper', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    const classes = (window as any).getConfigSectionFromStore('classes');
    expect(classes).toEqual(validConfig.classes);
  });

  it('should provide updateConfigSectionInStore helper', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    const newName = 'updated-project';
    (window as any).updateConfigSectionInStore('name', newName);
    
    // Get fresh state after update
    const updatedStore = useSegmentationStore.getState();
    expect(updatedStore.config?.name).toBe(newName);
  });

  it('should provide validateConfigFromStore helper', () => {
    const store = useSegmentationStore.getState();
    
    // No config loaded
    expect((window as any).validateConfigFromStore()).toBe(false);
    
    // Valid config loaded
    store.setConfig(validConfig);
    expect((window as any).validateConfigFromStore()).toBe(true);
  });

  it('should provide getConfigDebugInfoFromStore helper', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    const debugInfo = (window as any).getConfigDebugInfoFromStore();
    expect(debugInfo.loaded).toBe(true);
    expect(debugInfo.hasClasses).toBe(2);
  });
});

describe('Error Handling', () => {
  it('should handle validation errors gracefully', () => {
    const store = useSegmentationStore.getState();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test with completely invalid input
    expect(store.validateConfig(null as any)).toBe(false);
    expect(store.validateConfig(undefined as any)).toBe(false);
    expect(store.validateConfig("invalid" as any)).toBe(false);
    
    consoleSpy.mockRestore();
  });
});

describe('Integration with Related Stores', () => {
  it('should sync classes when config is set', () => {
    const store = useSegmentationStore.getState();
    store.setConfig(validConfig);
    
    expect(mockWindow.setClassesInStore).toHaveBeenCalledWith(validConfig.classes);
  });
});


/**
 * Legacy Bridge Utilities
 * 
 * Helper functions to bridge between legacy JavaScript and React components
 * during the migration process.
 * 
 * Migration Status:
 * - [x] API URLs (vars.url) - COMPLETE
 * - [x] Next Action (vars.next_action) - COMPLETE  
 * - [x] Just Logged In (vars.just_logged_in) - COMPLETE
 * - [x] Tool Size (vars.tool.size) - COMPLETE
 * - [x] Tool Resizing Mode (vars.tool.resizing_mode) - COMPLETE
 * - [x] Cursor Image (vars.cursor_image) - COMPLETE
 * - [x] Current Tool (vars.tool.type) - COMPLETE
 * - [x] Drag Start (vars.drag_start) - COMPLETE
 * - [x] Tool Shape (vars.tool.shape) - COMPLETE
 * - [x] Hidden Mask Canvas (vars.hidden_mask) - COMPLETE
 * - [x] Mask Area (vars.mask_area) - COMPLETE
 * - [x] Mask Data (vars.mask, vars.user_mask, vars.errors_mask) - COMPLETE
 * - [x] Mask Shape (vars.mask_shape) - COMPLETE
 * - [x] Classes (vars.classes) - COMPLETE
 * - [x] Config (vars.config) - COMPLETE
 * - [x] Confusion Matrix (vars.confusion_matrix) - COMPLETE
 */

import type { ProjectConfig, ClassConfig } from '../types/iris';

// Bridge function to trigger React mask layer renders from legacy code
export const triggerReactMaskRender = (bbox?: [number, number, number, number]) => {
  const event = new CustomEvent('react-mask-render', { 
    detail: { bbox } 
  });
  window.dispatchEvent(event);
};

// Bridge function to trigger React preview layer renders from legacy code
export const triggerReactPreviewRender = () => {
  const event = new CustomEvent('react-preview-render');
  window.dispatchEvent(event);
};

// Bridge function to get React layers (similar to legacy vm.getLayers)
export const getReactLayers = (type?: string) => {
  const w = window as any;
  const allLayers = [
    ...(w.reactRGBLayers || []),
    ...(w.reactMaskLayers || []),
    ...(w.reactPreviewLayers || []),
    ...(w.reactBingLayers || []),
  ];
  
  if (type) {
    return allLayers.filter((layer: any) => layer.type === type);
  }
  
  return allLayers;
};

// Bridge function to render all React layers
export const renderAllReactLayers = (layerType?: string) => {
  const layers = getReactLayers(layerType);
  layers.forEach((layer: any) => {
    if (layer.render) {
      layer.render();
    }
  });
};

// Initialize legacy bridge functions on window
if (typeof window !== 'undefined') {
  const w = window as any;
  
  // Config Helper Functions (NEW - vars.config migration)
  w.getConfigFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().config;
    }
    console.warn('[IRIS Migration] getConfigFromStore: React store not available');
    return null;
  };

  w.setConfigInStore = (config: ProjectConfig) => {
    if (w.segmentationStore) {
      const store = w.segmentationStore.getState();
      
      if (!store.validateConfig(config)) {
        console.error('[IRIS] setConfigInStore: Invalid config structure', config);
        return;
      }
      
      store.setConfig(config);
      
      // Sync related data to other stores
      if (config.classes && w.setClassesInStore) {
        w.setClassesInStore(config.classes);
      }
      if (config.segmentation?.mask_area && w.setMaskAreaInStore) {
        w.setMaskAreaInStore(config.segmentation.mask_area);
      }
    } else {
      console.warn('[IRIS Migration] setConfigInStore: React store not available');
    }
  };

  w.getConfigSectionFromStore = (section: keyof ProjectConfig) => {
    if (w.segmentationStore) {
      const config = w.segmentationStore.getState().config;
      return config ? config[section] : null;
    }
    console.warn('[IRIS Migration] getConfigSectionFromStore: React store not available');
    return null;
  };

  w.updateConfigSectionInStore = (section: keyof ProjectConfig, data: any) => {
    if (w.segmentationStore) {
      const store = w.segmentationStore.getState();
      const currentConfig = store.config;
      
      if (!currentConfig) {
        console.error('[IRIS] updateConfigSectionInStore: No config available to update');
        return;
      }
      
      const updatedConfig = { ...currentConfig, [section]: data };
      
      if (!store.validateConfig(updatedConfig)) {
        console.error('[IRIS] updateConfigSectionInStore: Invalid config after update', { section, data });
        return;
      }
      
      store.setConfig(updatedConfig);
      
      // Sync specific sections to related stores
      if (section === 'classes' && w.setClassesInStore) {
        w.setClassesInStore(data as ClassConfig[]);
      }
      if (section === 'segmentation' && data?.mask_area && w.setMaskAreaInStore) {
        w.setMaskAreaInStore(data.mask_area);
      }
    } else {
      console.warn('[IRIS Migration] updateConfigSectionInStore: React store not available');
    }
  };

  w.validateConfigFromStore = () => {
    if (w.segmentationStore) {
      const store = w.segmentationStore.getState();
      const config = store.config;
      return config ? store.validateConfig(config) : false;
    }
    console.warn('[IRIS Migration] validateConfigFromStore: React store not available');
    return false;
  };

  w.getConfigDebugInfoFromStore = () => {
    if (w.segmentationStore) {
      const store = w.segmentationStore.getState();
      const config = store.config;
      
      return {
        loaded: config !== null,
        sections: config ? Object.keys(config) : [],
        valid: config ? store.validateConfig(config) : false,
        hasClasses: config?.classes ? config.classes.length : 0,
        hasViews: config?.views ? config.views.length : 0,
        hasViewGroups: config?.view_groups ? config.view_groups.length : 0,
        hasSegmentation: !!config?.segmentation,
        hasAIModel: !!config?.segmentation?.ai_model
      };
    }
    console.warn('[IRIS Migration] getConfigDebugInfoFromStore: React store not available');
    return {
      loaded: false,
      sections: [],
      valid: false,
      hasClasses: 0,
      hasViews: 0,
      hasViewGroups: 0,
      hasSegmentation: false,
      hasAIModel: false
    };
  };

  // User Helper Functions (NEW - vars.user migration)
  w.getUserFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().user;
    }
    console.warn('[IRIS Migration] getUserFromStore: React store not available');
    return null;
  };

  w.setUserInStore = (user: any) => {
    if (w.segmentationStore) {
      const store = w.segmentationStore.getState();
      
      // Validate user structure
      if (!user || typeof user !== 'object') {
        console.error('[IRIS] setUserInStore: Invalid user object', user);
        return;
      }
      
      // Validate required fields
      const requiredFields = ['id', 'name', 'admin', 'tested', 'created', 'image_seed', 'segmentation'];
      for (const field of requiredFields) {
        if (!(field in user)) {
          console.error(`[IRIS] setUserInStore: Missing required field: ${field}`);
          return;
        }
      }
      
      // Validate segmentation object
      if (!user.segmentation || typeof user.segmentation !== 'object') {
        console.error('[IRIS] setUserInStore: Invalid segmentation object');
        return;
      }
      
      const requiredSegmentationFields = ['score', 'score_unverified', 'n_masks'];
      for (const field of requiredSegmentationFields) {
        if (!(field in user.segmentation)) {
          console.error(`[IRIS] setUserInStore: Missing required segmentation field: ${field}`);
          return;
        }
      }
      
      store.setUser(user);
    } else {
      console.warn('[IRIS Migration] setUserInStore: React store not available');
    }
  };

  w.getUserStatsFromStore = () => {
    if (w.segmentationStore) {
      const user = w.segmentationStore.getState().user;
      return user ? user.segmentation : null;
    }
    console.warn('[IRIS Migration] getUserStatsFromStore: React store not available');
    return null;
  };

  w.isAdminFromStore = () => {
    if (w.segmentationStore) {
      const user = w.segmentationStore.getState().user;
      return user ? user.admin : false;
    }
    console.warn('[IRIS Migration] isAdminFromStore: React store not available');
    return false;
  };

  w.getUserNameFromStore = () => {
    if (w.segmentationStore) {
      const user = w.segmentationStore.getState().user;
      return user ? user.name : '';
    }
    console.warn('[IRIS Migration] getUserNameFromStore: React store not available');
    return '';
  };

  w.getUserIdFromStore = () => {
    if (w.segmentationStore) {
      const user = w.segmentationStore.getState().user;
      return user ? user.id : null;
    }
    console.warn('[IRIS Migration] getUserIdFromStore: React store not available');
    return null;
  };

  w.isNewUserFromStore = () => {
    if (w.segmentationStore) {
      const user = w.segmentationStore.getState().user;
      return user ? user.segmentation.n_masks === 0 : false;
    }
    console.warn('[IRIS Migration] isNewUserFromStore: React store not available');
    return false;
  };

  // CRITICAL: Confusion Matrix Helper Functions (NEW - vars.confusion_matrix migration)
  w.getConfusionMatrixFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().confusionMatrix;
    }
    console.warn('[IRIS Migration] getConfusionMatrixFromStore: React store not available');
    return null;
  };

  w.setConfusionMatrixInStore = (matrix: any) => {
    if (w.segmentationStore) {
      const store = w.segmentationStore.getState();
      
      // Validate confusion matrix structure
      if (!matrix || typeof matrix !== 'object') {
        console.error('[IRIS] setConfusionMatrixInStore: Invalid matrix object', matrix);
        return;
      }
      
      if (!Array.isArray(matrix.matrix) || matrix.matrix.length === 0) {
        console.error('[IRIS] setConfusionMatrixInStore: Invalid matrix array');
        return;
      }
      
      store.updateConfusionMatrix(matrix);
    } else {
      console.warn('[IRIS Migration] setConfusionMatrixInStore: React store not available');
    }
  };

  w.getAccuracyStatsFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().getAccuracyStats();
    }
    console.warn('[IRIS Migration] getAccuracyStatsFromStore: React store not available');
    return null;
  };

  w.clearConfusionMatrixFromStore = () => {
    if (w.segmentationStore) {
      w.segmentationStore.getState().clearConfusionMatrix();
    } else {
      console.warn('[IRIS Migration] clearConfusionMatrixFromStore: React store not available');
    }
  };

  w.getConfusionMatrixDataFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().getConfusionMatrixData();
    }
    console.warn('[IRIS Migration] getConfusionMatrixDataFromStore: React store not available');
    return null;
  };

  w.createConfusionMatrixFromStore = (matrix: number[][], truePositives: any, userClasses: number[], classNames: string[]) => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().createConfusionMatrix(matrix, truePositives, userClasses, classNames);
    }
    console.warn('[IRIS Migration] createConfusionMatrixFromStore: React store not available');
    return null;
  };

  // CRITICAL: User Pixel Counts Helper Functions (NEW - vars.n_user_pixels migration)
  w.getUserPixelCountsFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().userPixelCounts;
    }
    console.warn('[IRIS Migration] getUserPixelCountsFromStore: React store not available');
    return { total: 0 };
  };

  w.updateUserPixelCountsInStore = () => {
    if (w.segmentationStore) {
      const store = w.segmentationStore.getState();
      const newCounts = store.calculatePixelCounts();
      store.updateUserPixelCounts(newCounts);
      return newCounts;
    }
    console.warn('[IRIS Migration] updateUserPixelCountsInStore: React store not available');
    return { total: 0 };
  };

  w.getClassPixelCountFromStore = (classId: number) => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().getClassPixelCount(classId);
    }
    console.warn('[IRIS Migration] getClassPixelCountFromStore: React store not available');
    return 0;
  };

  w.getTotalUserPixelsFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().getTotalUserPixels();
    }
    console.warn('[IRIS Migration] getTotalUserPixelsFromStore: React store not available');
    return 0;
  };

  w.validateAITrainingDataFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().validateAITrainingData();
    }
    console.warn('[IRIS Migration] validateAITrainingDataFromStore: React store not available');
    return {
      isValid: false,
      classesWithEnoughPixels: 0,
      totalPixels: 0,
      classPixelCounts: {},
      minPixelsRequired: 10,
      minClassesRequired: 2
    };
  };

  w.recalculatePixelCountsFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().recalculatePixelCounts();
    }
    console.warn('[IRIS Migration] recalculatePixelCountsFromStore: React store not available');
    return { total: 0 };
  };

  // Image ID bridge functions for legacy JavaScript access
  w.getCurrentImageIdFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().currentImageId;
    }
    console.warn('[IRIS Migration] getCurrentImageIdFromStore: React store not available');
    return null;
  };
  
  w.setCurrentImageIdInStore = (imageId: string) => {
    if (w.segmentationStore) {
      console.log('[IRIS Migration] ✅ Real bridge: Setting current image ID in React store');
      w.segmentationStore.getState().setCurrentImage(imageId);
    } else {
      console.log('[IRIS Migration] ⏳ React store not available, storing image ID as pending');
      w._pendingImageId = imageId;
    }
  };
  
  w.getImageInfoFromStore = (imageId: string) => {
    if (w.segmentationStore) {
      const { images } = w.segmentationStore.getState();
      return images.find((img: any) => img.image_id === imageId) || null;
    }
    console.warn('[IRIS Migration] getImageInfoFromStore: React store not available');
    return null;
  };
  
  w.getCurrentImageInfoFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().getCurrentImage();
    }
    console.warn('[IRIS Migration] getCurrentImageInfoFromStore: React store not available');
    return null;
  };
  
  w.validateImageIdFromStore = (imageId: string) => {
    if (w.segmentationStore) {
      if (typeof imageId !== 'string' || imageId.trim() === '') {
        return false;
      }
      const { images } = w.segmentationStore.getState();
      return images.some((img: any) => img.image_id === imageId);
    }
    console.warn('[IRIS Migration] validateImageIdFromStore: React store not available');
    return false;
  };
  
  w.getNextImageIdFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().getNextImageId();
    }
    console.warn('[IRIS Migration] getNextImageIdFromStore: React store not available');
    return null;
  };
  
  w.getPrevImageIdFromStore = () => {
    if (w.segmentationStore) {
      return w.segmentationStore.getState().getPrevImageId();
    }
    console.warn('[IRIS Migration] getPrevImageIdFromStore: React store not available');
    return null;
  };
  
  // Override legacy render_mask function to also trigger React renders
  const originalRenderMask = w.render_mask;
  w.render_mask = (bbox?: [number, number, number, number]) => {    
    // Call original legacy function
    if (originalRenderMask) {
      originalRenderMask(bbox);
    }
    
    // For React mask renders, we need to be careful about bbox handling
    // If bbox is provided, check if we're using a round brush
    let reactBbox = bbox;
    if (bbox && w.getToolShapeFromStore) {
      const toolShape = w.getToolShapeFromStore();
      if (toolShape === 'round') {
        // For round brushes, force full re-render to show circular shape properly
        console.log('[IRIS] Legacy bridge: forcing full re-render for round brush');
        reactBbox = undefined;
      }
    }
    
    // Trigger React mask renders
    triggerReactMaskRender(reactBbox);
  };
  
  // Override legacy render_preview function
  const originalRenderPreview = w.render_preview;
  w.render_preview = () => {
    // Call original legacy function
    if (originalRenderPreview) {
      originalRenderPreview();
    }
    
    // Also trigger React preview renders
    triggerReactPreviewRender();
  };
  
  // Override legacy zoom function to trigger React re-renders
  const originalZoom = w.zoom;
  w.zoom = (delta: number) => {
    // Call original legacy zoom function
    if (originalZoom) {
      originalZoom(delta);
    }
    
    // Trigger React canvas re-renders after zoom
    setTimeout(() => {
      const event = new CustomEvent('iris-transform-change');
      window.dispatchEvent(event);
    }, 0);
  };
  
  // Override legacy move function to trigger React re-renders
  const originalMove = w.move;
  w.move = (dx: number, dy: number) => {
    // Call original legacy move function
    if (originalMove) {
      originalMove(dx, dy);
    }
    
    // Trigger React canvas re-renders after move
    setTimeout(() => {
      const event = new CustomEvent('iris-transform-change');
      window.dispatchEvent(event);
    }, 0);
  };
  
  // Add React layer management to ViewManager via store
  const viewManager = w.getViewManagerFromStore ? w.getViewManagerFromStore() : null;
  if (viewManager) {
    const originalGetLayers = viewManager.getLayers;
    viewManager.getReactLayers = getReactLayers;
    viewManager.renderReactLayers = renderAllReactLayers;
    
    // Override getLayers to include React layers
    viewManager.getLayers = (type?: string, exclude = false) => {
      const legacyLayers = originalGetLayers ? originalGetLayers(type, exclude) : [];
      const reactLayers = getReactLayers(type);
      return [...legacyLayers, ...reactLayers];
    };
  } else {
    console.warn('[IRIS Migration] ⚠️ ViewManager not available for React layer integration');
  }
  
  // Expose bridge functions globally for debugging
  w.reactBridge = {
    triggerReactMaskRender,
    triggerReactPreviewRender,
    getReactLayers,
    renderAllReactLayers,
  };
}
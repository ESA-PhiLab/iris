import { useCallback } from 'react';
import { useSegmentationStore } from '../stores/segmentationStore';
import { useViewManagerStore } from '../stores/viewManagerStore';

export interface ConfigLoaderResult {
  loading: boolean;
  error: string | null;
  loadConfig: () => Promise<void>;
}

export const useConfigLoader = (): ConfigLoaderResult => {
  const loadConfig = useCallback(async () => {
    try {
      const w = window as any;
      if (w.IRIS_DEBUG) console.log('🔧 React: Loading config directly from APIs...');
      
      // Extract image_id from URL parameters OR from initial vars (set by backend template)
      const urlParams = new URLSearchParams(window.location.search);
      const imageIdFromUrl = urlParams.get('image_id');
      const imageIdFromVars = (window as any).vars?.image_id;
      const imageId = imageIdFromUrl || imageIdFromVars;
      
      // Load config and user data in parallel
      const [configResponse, userResponse] = await Promise.all([
        fetch('/segmentation/api/config', { credentials: 'same-origin' }),
        fetch('/user/get/current', { credentials: 'same-origin' })
      ]);

      if (!configResponse.ok) {
        throw new Error(`Config API failed: ${configResponse.statusText}`);
      }
      if (!userResponse.ok) {
        throw new Error(`User API failed: ${userResponse.statusText}`);
      }

      const config = await configResponse.json();
      const user = await userResponse.json();
      
      if (w.IRIS_DEBUG) console.log('✅ React: Config and user data loaded successfully');

      // Get stores directly to avoid dependency issues
      const segmentationStore = useSegmentationStore.getState();
      const viewManagerStore = useViewManagerStore.getState();

      // CRITICAL: Set current image ID from URL or initial vars (before other initialization)
      if (imageId) {
        // CRITICAL: Clear any existing mask data before setting new image
        // This prevents the previous image's mask from being displayed
        segmentationStore.clearMask();
        if (w.IRIS_DEBUG) console.log('🔧 React: Cleared previous mask data before loading new image');
        
        segmentationStore.setCurrentImage(imageId);
        if (w.IRIS_DEBUG) console.log('🔧 React: Set current image ID:', imageId, 'from', imageIdFromUrl ? 'URL' : 'vars');
      } else {
        console.warn('⚠️ React: No image ID found in URL or vars');
      }

      // Initialize segmentation store
      segmentationStore.setConfig(config);
      segmentationStore.setUser(user);
      segmentationStore.setClasses(config.classes || []);

      // Set current class to first class if available
      if (config.classes && config.classes.length > 0) {
        segmentationStore.setCurrentClass(0);
      }

      // Initialize ViewManager store
      let views: { [name: string]: any } = {};
      if (config.views) {
        // Handle both array and object formats
        if (Array.isArray(config.views)) {
          config.views.forEach((view: any) => {
            views[view.name] = {
              name: view.name,
              type: view.type || 'image',
              description: view.description || '',
            };
          });
        } else if (typeof config.views === 'object') {
          Object.entries(config.views).forEach(([name, view]: [string, any]) => {
            views[name] = {
              name: name,
              type: view.type || 'image',
              description: view.description || '',
            };
          });
        }
        
        viewManagerStore.setViews(views);
      }

      // Set view groups
      if (config.view_groups) {
        if (Array.isArray(config.view_groups)) {
          // Handle array of arrays vs simple array
          if (config.view_groups.length > 0 && Array.isArray(config.view_groups[0])) {
            // Convert array of arrays format to object format
            const viewGroupsObj: { [key: string]: string[] } = {};
            config.view_groups.forEach((group: string[], index: number) => {
              viewGroupsObj[`group_${index}`] = group;
            });
            viewManagerStore.setViewGroups(viewGroupsObj);
          } else {
            // Simple array - use as default group
            viewManagerStore.setViewGroups({ default: config.view_groups as string[] });
          }
        } else {
          viewManagerStore.setViewGroups(config.view_groups);
        }
      } else {
        // Default group with available views - use the views object we just created
        const viewNames = Object.keys(views || {});
        if (viewNames.length > 0) {
          viewManagerStore.setViewGroups({ default: viewNames.slice(0, 3) });
        }
      }

      // Set image dimensions
      if (config.images?.shape && Array.isArray(config.images.shape) && config.images.shape.length >= 2) {
        const [width, height] = config.images.shape;
        viewManagerStore.setImageDimensions(width, height);
      }

      // Set mask area and calculate mask dimensions
      if (config.segmentation?.mask_area) {
        const maskArea = config.segmentation.mask_area;
        segmentationStore.setMaskArea(maskArea);
        
        // Calculate mask dimensions from mask area [x, y, x2, y2] -> [width, height]
        if (Array.isArray(maskArea) && maskArea.length === 4) {
          const [x, y, x2, y2] = maskArea;
          const maskWidth = x2 - x;
          const maskHeight = y2 - y;
          segmentationStore.setMaskDimensions({ width: maskWidth, height: maskHeight });
          const w = window as any;
          if (w.IRIS_DEBUG) console.log('🔧 React: Set mask area and dimensions:', maskArea, '->', [maskWidth, maskHeight]);
        }
      }

      // Set current image from URL params
      const currentImageId = segmentationStore.currentImageId;
      if (currentImageId) {
        segmentationStore.setCurrentImage(currentImageId);
        const imageLocation = viewManagerStore.imageLocation || [0, 0];
        viewManagerStore.setImage(currentImageId, imageLocation);
      }

      if (w.IRIS_DEBUG) console.log('✅ React: All stores initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ React: Config loading failed:', errorMessage);
      throw error;
    }
  }, []); // Empty dependency array to prevent re-creation

  return {
    loading: false, // You can add loading state if needed
    error: null,    // You can add error state if needed
    loadConfig
  };
};
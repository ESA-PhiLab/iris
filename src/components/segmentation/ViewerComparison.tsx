/**
 * React ViewManager Component
 * 
 * This component displays the React ViewManager for image segmentation.
 * The legacy ViewManager has been removed as part of the migration to React.
 */

import React, { useEffect } from 'react';
import ReactViewManager from './ReactViewManager';
import ErrorBoundary from './ErrorBoundary';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import { useSegmentationStore } from '../../stores/segmentationStore';

interface ViewerComparisonProps {
  // Props interface kept for future extensibility
}

const ViewerComparison: React.FC<ViewerComparisonProps> = () => {
  // Use store hooks instead of direct window access
  const { isInitialized } = useViewManagerStore();
  const { config } = useSegmentationStore();

  // Initialize React ViewManager from React config (not legacy vars)
  useEffect(() => {
    if (!isInitialized && config) {
      const viewManagerStore = useViewManagerStore.getState();
      
      try {
        // Initialize views from React config
        const views: { [name: string]: any } = {};
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

        // Initialize view groups from React config
        if (config.view_groups) {
          // Handle different view_groups formats
          if (Array.isArray(config.view_groups)) {
            // If it's an array of arrays, convert to object format
            if (config.view_groups.length > 0 && Array.isArray(config.view_groups[0])) {
              const viewGroupsObj: { [key: string]: string[] } = {};
              config.view_groups.forEach((group: string[], index: number) => {
                viewGroupsObj[`group_${index}`] = group;
              });
              viewManagerStore.setViewGroups(viewGroupsObj);
            } else {
              // If it's a simple array, use as default group
              viewManagerStore.setViewGroups({ default: config.view_groups as unknown as string[] });
            }
          } else {
            // If it's already an object, use directly
            viewManagerStore.setViewGroups(config.view_groups);
          }
        } else {
          // Default group with available views - use the views object we just created
          const viewNames = Object.keys(views || {});
          if (viewNames.length > 0) {
            viewManagerStore.setViewGroups({ default: viewNames.slice(0, 3) });
          }
        }

        // Set image dimensions from React config
        if (config.images && typeof config.images === 'object' && 'shape' in config.images) {
          const shape = (config.images as any).shape;
          if (Array.isArray(shape) && shape.length >= 2) {
            const [width, height] = shape;
            viewManagerStore.setImageDimensions(width, height);
          }
        }

        // Set current image from store
        const currentImageId = useSegmentationStore.getState().currentImageId;
        if (currentImageId) {
          const imageLocation = viewManagerStore.imageLocation || [0, 0];
          viewManagerStore.setImage(currentImageId, imageLocation);
        }

        // Mark as initialized
        viewManagerStore.setInitialized(true);
        
      } catch (error) {
        console.error('❌ ViewerComparison: Failed to initialize ViewManager from React config:', error);
        viewManagerStore.setInitialized(false);
      }
    }
  }, [isInitialized, config]);
  
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%', // Use full available height
    minHeight: '0', // Allow shrinking
    maxHeight: '100%', // Don't exceed parent
    backgroundColor: '#fff',
    overflow: 'hidden', // Prevent overflow
    padding: '10px',
    boxSizing: 'border-box', // Include padding in dimensions
    display: 'flex', // Use flexbox for proper sizing
    flexDirection: 'column', // Stack children vertically
  };
  
  return (
    <div style={containerStyle}>
      {isInitialized ? (
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('React ViewManager crashed:', error, errorInfo);
          }}
        >
          <ReactViewManager style={{ flex: 1 }} />
        </ErrorBoundary>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
            fontSize: '14px',
          }}
        >
          {config ? 'Initializing React ViewManager...' : 'Loading configuration...'}
        </div>
      )}
    </div>
  );
};

export default ViewerComparison;
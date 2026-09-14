import React from 'react';
import ToolButton from './ToolButton';
import { ImageNavigationDropdown } from './ImageNavigationDropdown';
import { useSegmentationStore } from '../../../stores/segmentationStore';

interface NavigationToolsProps {
  onExportGeoTIFF: () => void;
}

const NavigationTools: React.FC<NavigationToolsProps> = ({ onExportGeoTIFF }) => {
  const { 
    getPrevImageId, 
    getNextImageId, 
    navigateNext, 
    navigatePrev,
    saveCurrentMask,
    isLoading,
    maskChanged
  } = useSegmentationStore();
  
  const hasPrev = getPrevImageId() !== null;
  const hasNext = getNextImageId() !== null;

  const handleNavigateToImage = (imageId: string) => {
    const w = window as any;
    
    // Check if user has unsaved changes - this is the correct condition
    const store = useSegmentationStore.getState();
    const hasUnsavedChanges = store.maskChanged;
    
    console.log('[IRIS Navigation] handleNavigateToImage called:', {
      imageId,
      hasUnsavedChanges,
      currentImageId: store.currentImageId
    });
    
    if (hasUnsavedChanges) {
      // User has unsaved changes - show confirmation dialog
      console.log('[IRIS Navigation] Showing dialogue for unsaved changes');
      if (w.dialogue_before_next_image) {
        // Store the target image ID for after the dialog
        w.pendingNavigationImageId = imageId;
        w.dialogue_before_next_image();
      } else {
        console.warn('dialogue_before_next_image not available');
      }
    } else {
      // No unsaved changes - navigate directly
      console.log('[IRIS Navigation] Navigating directly to:', imageId);
      const url = `/segmentation/?image_id=${encodeURIComponent(imageId)}`;
      if (w.goto_url) {
        w.goto_url(url);
      } else {
        window.location.href = url;
      }
    }
  };

  const handlePrevious = async () => {
    if (maskChanged) {
      // Save first, then navigate
      try {
        await saveCurrentMask();
        const prevImageId = navigatePrev();
        if (prevImageId) {
          const url = `/segmentation/?image_id=${encodeURIComponent(prevImageId)}`;
          const w = window as any;
          if (w.goto_url) {
            w.goto_url(url);
          } else {
            window.location.href = url;
          }
        }
      } catch (error) {
        console.error('Failed to save before navigation:', error);
      }
    } else {
      // Navigate directly
      const prevImageId = navigatePrev();
      if (prevImageId) {
        const url = `/segmentation/?image_id=${encodeURIComponent(prevImageId)}`;
        const w = window as any;
        if (w.goto_url) {
          w.goto_url(url);
        } else {
          window.location.href = url;
        }
      }
    }
  };

  const handleNext = async () => {
    if (maskChanged) {
      // Save first, then navigate
      try {
        await saveCurrentMask();
        const nextImageId = navigateNext();
        if (nextImageId) {
          const url = `/segmentation/?image_id=${encodeURIComponent(nextImageId)}`;
          const w = window as any;
          if (w.goto_url) {
            w.goto_url(url);
          } else {
            window.location.href = url;
          }
        }
      } catch (error) {
        console.error('Failed to save before navigation:', error);
      }
    } else {
      // Navigate directly
      const nextImageId = navigateNext();
      if (nextImageId) {
        const url = `/segmentation/?image_id=${encodeURIComponent(nextImageId)}`;
        const w = window as any;
        if (w.goto_url) {
          w.goto_url(url);
        } else {
          window.location.href = url;
        }
      }
    }
  };

  const handleSave = async () => {
    try {
      await saveCurrentMask();
    } catch (error) {
      console.error('Failed to save mask:', error);
      // Error handling is done in the store action
    }
  };

  return (
    <>
      <ToolButton
        id="tb_previous_image"
        icon="/segmentation/static/icons/previous.png"
        onClick={handlePrevious}
        disabled={!hasPrev || isLoading}
        title={hasPrev ? "Previous image" : "No previous image"}
      />
      <ImageNavigationDropdown
        onNavigate={handleNavigateToImage}
      />
      <ToolButton
        id="tb_next_image"
        icon="/segmentation/static/icons/next.png"
        onClick={handleNext}
        disabled={!hasNext || isLoading}
        title={hasNext ? "Next image" : "No more images"}
      />
      <ToolButton
        id="tb_save_mask"
        icon="/segmentation/static/icons/save_mask.png"
        onClick={handleSave}
        disabled={isLoading}
        title={isLoading ? "Saving..." : maskChanged ? "Save mask (unsaved changes)" : "Save mask"}
      />
      <ToolButton
        id="tb_export_geotiff"
        icon="/segmentation/static/icons/export.png"
        onClick={onExportGeoTIFF}
        title="Export GeoTIFF"
        disabled={isLoading}
      />
    </>
  );
};

export default NavigationTools;

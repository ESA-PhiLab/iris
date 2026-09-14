import React from 'react';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useTheme } from '../../contexts/ThemeContext';
import { ImageNavigationDropdown } from './toolbar/ImageNavigationDropdown';
import { 
  SaveIcon, 
  DownloadIcon, 
  UserIcon, 
  SettingsIcon, 
  HelpIcon,
  ChevronLeftIcon,
  ChevronRightIcon 
} from '../icons/ToolbarIcons';

interface TopBarProps {
  onOpenPreferences: () => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onOpenPreferences, onOpenHelp, onOpenProfile }) => {
  const { theme } = useTheme();
  const config = useSegmentationStore((state) => state.config);
  const projectName = config?.name || 'IRIS';
  
  const { 
    getPrevImageId, 
    getNextImageId, 
    navigateNext, 
    navigatePrev,
    saveCurrentMask,
    isLoading,
    maskChanged,
  } = useSegmentationStore();
  
  const hasPrev = getPrevImageId() !== null;
  const hasNext = getNextImageId() !== null;

  const handleNavigateToImage = (imageId: string) => {
    const w = window as any;
    const store = useSegmentationStore.getState();
    const hasUnsavedChanges = store.maskChanged;
    
    if (hasUnsavedChanges) {
      if (w.dialogue_before_next_image) {
        w.pendingNavigationImageId = imageId;
        w.dialogue_before_next_image();
      }
    } else {
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
    }
  };

  const handleExportGeoTIFF = async () => {
    try {
      const imageId = useSegmentationStore.getState().currentImageId;
      if (!imageId) {
        alert('No image loaded');
        return;
      }

      const w = window as any;
      if (w.show_message) w.show_message('Exporting GeoTIFF...');

      const response = await fetch(`/segmentation/api/export-geotiff/${imageId}`, {
        method: 'GET',
        credentials: 'same-origin'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${imageId}_annotated.tif`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        if (w.show_message) w.show_message('GeoTIFF exported successfully', 2000);
      } else {
        const error = await response.json();
        const errorMsg = error.message || error.error || 'Export failed';
        if (w.show_dialogue) {
          w.show_dialogue('error', `<p>Could not export GeoTIFF: ${errorMsg}</p>`);
        } else {
          alert(`Export failed: ${errorMsg}`);
        }
      }
    } catch (error) {
      const w = window as any;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (w.show_dialogue) {
        w.show_dialogue('error', `<p>Could not export GeoTIFF: ${errorMsg}</p>`);
      } else {
        alert(`Export failed: ${errorMsg}`);
      }
    }
  };

  return (
    <div
      data-testid="top-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        backgroundColor: theme.toolbarBg,
        color: theme.toolbarText,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Left: Project Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{projectName}</h1>
      </div>

      {/* Center: Image Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handlePrevious}
          disabled={!hasPrev || isLoading}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.toolbarBorder}`,
            color: theme.toolbarText,
            cursor: !hasPrev || isLoading ? 'not-allowed' : 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            opacity: !hasPrev || isLoading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '500',
          }}
          onMouseEnter={(e) => {
            if (hasPrev && !isLoading) {
              e.currentTarget.style.backgroundColor = theme.toolbarHover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={hasPrev ? "Previous image" : "No previous image"}
        >
          <ChevronLeftIcon size={16} color={theme.toolbarText} />
          Prev
        </button>
        
        <div style={{ color: theme.toolbarText }}>
          <ImageNavigationDropdown onNavigate={handleNavigateToImage} />
        </div>
        
        <button
          onClick={handleNext}
          disabled={!hasNext || isLoading}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.toolbarBorder}`,
            color: theme.toolbarText,
            cursor: !hasNext || isLoading ? 'not-allowed' : 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            opacity: !hasNext || isLoading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '500',
          }}
          onMouseEnter={(e) => {
            if (hasNext && !isLoading) {
              e.currentTarget.style.backgroundColor = theme.toolbarHover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={hasNext ? "Next image" : "No more images"}
        >
          Next
          <ChevronRightIcon size={16} color={theme.toolbarText} />
        </button>
        
        <div style={{ width: '1px', height: '30px', backgroundColor: theme.toolbarBorder, margin: '0 5px' }} />
        
        <button
          onClick={handleSave}
          disabled={isLoading}
          style={{
            background: maskChanged ? theme.buttonDangerBg : 'transparent',
            border: `1px solid ${theme.toolbarBorder}`,
            color: theme.toolbarText,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: maskChanged ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && !maskChanged) {
              e.currentTarget.style.backgroundColor = theme.toolbarHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!maskChanged) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title={isLoading ? "Saving..." : maskChanged ? "Save mask (unsaved changes)" : "Save mask"}
        >
          <SaveIcon size={16} color={theme.toolbarText} />
          Save
        </button>
        
        <button
          onClick={handleExportGeoTIFF}
          disabled={isLoading}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.toolbarBorder}`,
            color: theme.toolbarText,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = theme.toolbarHover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Export GeoTIFF"
        >
          <DownloadIcon size={16} color={theme.toolbarText} />
          Export
        </button>
      </div>

      {/* Right: User & Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={onOpenProfile}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.toolbarText,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.toolbarHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="User Profile"
        >
          <UserIcon size={20} color={theme.toolbarText} />
        </button>
        <button
          data-testid="preferences-button"
          onClick={onOpenPreferences}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.toolbarText,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.toolbarHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Settings"
        >
          <SettingsIcon size={20} color={theme.toolbarText} />
        </button>
        <button
          onClick={onOpenHelp}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.toolbarText,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.toolbarHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Help"
        >
          <HelpIcon size={20} color={theme.toolbarText} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;

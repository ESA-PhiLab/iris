import React from 'react';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useUiStore } from '../../stores/uiStore';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import { annotatedGeoTiff, exportView } from '../../export/annotated';
import { downloadFile } from '../../utils/download';
import { goToImage, goToNextImage, goToPreviousImage } from '../../segmentation/navigation';
import { saveMask } from '../../segmentation/commands';
import { useTheme } from '../../contexts/ThemeContext';
import { tooltip } from '../../utils/shortcuts';
import { useShortcut } from '../../hooks/useShortcut';
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
  
  const isLoading = useSegmentationStore((state) => state.isLoading);
  const maskChanged = useSegmentationStore((state) => state.maskChanged);
  // Read again when the image list or the current image changes
  useSegmentationStore((state) => state.images);
  useSegmentationStore((state) => state.currentImageId);
  const { getPrevImageId, getNextImageId } = useSegmentationStore.getState();

  const hasPrev = getPrevImageId() !== null;
  const hasNext = getNextImageId() !== null;

  const handleNavigateToImage = (imageId: string) => { goToImage(imageId); };
  const handlePrevious = () => { goToPreviousImage(); };
  const handleNext = () => { goToNextImage(); };
  const handleSave = () => { saveMask(); };

  const handleExportGeoTIFF = async () => {
    const { currentImageId, maskData, maskArea } = useSegmentationStore.getState();
    const { georef, views } = useViewManagerStore.getState();
    if (!currentImageId || !maskData || !maskArea || !georef) return;
    const ui = useUiStore.getState();
    ui.notify('Exporting GeoTIFF...');
    try {
      const bytes = await annotatedGeoTiff({
        imageId: currentImageId,
        georef,
        maskArea,
        mask: maskData,
        description: 'Segmentation Mask',
        view: exportView(views),
      });
      downloadFile(bytes, `${currentImageId}_annotated.tif`);
      ui.notify('GeoTIFF exported successfully', 2000);
    } catch (error) {
      ui.showErrorModal(error instanceof Error ? error.message : String(error), 'Could not export GeoTIFF');
    }
  };

  useShortcut('exportGeoTIFF', () => {
    if (!isLoading) handleExportGeoTIFF();
  });

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
        <h1
          title={projectName}
          style={{
            margin: 0,
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {projectName}
        </h1>
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
          {...(hasPrev ? tooltip("Save and open the previous image", "previousImage") : tooltip("No previous image"))}
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
          {...(hasNext ? tooltip("Save and open the next image", "nextImage") : tooltip("No more images"))}
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
          {...(isLoading ? tooltip("Saving...") : tooltip(maskChanged ? "Save mask, unsaved changes" : "Save mask", "save"))}
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
          {...tooltip('Export GeoTIFF', 'exportGeoTIFF')}
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
          {...tooltip('User profile', 'profile')}
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
          {...tooltip('Settings', 'settings')}
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
          {...tooltip('Help', 'help')}
        >
          <HelpIcon size={20} color={theme.toolbarText} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;

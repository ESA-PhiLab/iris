import React from 'react';
import NavigationTools from './toolbar/NavigationTools';
import EditingTools from './toolbar/EditingTools';
import ClassSelector from './toolbar/ClassSelector';
import DrawingTools from './toolbar/DrawingTools';
import MaskTools from './toolbar/MaskTools';
import FilterTools from './toolbar/FilterTools';
import SettingsTools from './toolbar/SettingsTools';
import ToolbarSeparator from './toolbar/ToolbarSeparator';

interface SegmentationToolbarProps {
  onExportGeoTIFF: () => void;
  onSelectClass: () => void;
  onResetMask: () => void;
  onOpenHelp: () => void;
  onOpenPreferences: () => void;
}

const SegmentationToolbar: React.FC<SegmentationToolbarProps> = ({
  onExportGeoTIFF,
  onSelectClass,
  onResetMask,
  onOpenHelp,
  onOpenPreferences
}) => {
  return (
    <ul className="toolbar" id="toolbar" style={{ visibility: 'visible' }}>
      <NavigationTools onExportGeoTIFF={onExportGeoTIFF} />
      <EditingTools />
      <ToolbarSeparator />
      <ClassSelector onSelectClass={onSelectClass} />
      <ToolbarSeparator />
      <DrawingTools onResetMask={onResetMask} />
      <ToolbarSeparator />
      <MaskTools />
      <ToolbarSeparator />
      <FilterTools />
      <ToolbarSeparator />
      <SettingsTools onOpenHelp={onOpenHelp} onOpenPreferences={onOpenPreferences} />
    </ul>
  );
};

export default SegmentationToolbar;

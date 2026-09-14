import React from 'react';
import ToolButton from './ToolButton';

interface SettingsToolsProps {
  onOpenHelp: () => void;
  onOpenPreferences: () => void;
}

const SettingsTools: React.FC<SettingsToolsProps> = ({ onOpenHelp, onOpenPreferences }) => {
  return (
    <>
      <ToolButton
        icon="/segmentation/static/icons/help.png"
        onClick={onOpenHelp}
      />
      <ToolButton
        icon="/segmentation/static/icons/preferences.png"
        onClick={onOpenPreferences}
        testId="preferences-button"
      />
    </>
  );
};

export default SettingsTools;

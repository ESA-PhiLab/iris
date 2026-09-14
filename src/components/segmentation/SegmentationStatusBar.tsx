import React from 'react';
import UserInfo from './statusbar/UserInfo';
import AdminButton from './statusbar/AdminButton';
import ImageInfo from './statusbar/ImageInfo';
import StatsDisplay from './statusbar/StatsDisplay';
import AIScore from './statusbar/AIScore';
import AIRecommendation from './statusbar/AIRecommendation';

interface SegmentationStatusBarProps {
  onOpenProfile: () => void;
  onOpenImageInfo: () => void;
  onOpenConfusionMatrix: () => void;
}

const SegmentationStatusBar: React.FC<SegmentationStatusBarProps> = ({
  onOpenProfile,
  onOpenImageInfo,
  onOpenConfusionMatrix
}) => {
  return (
    <div
      id="statusbar"
      className="statusbar"
      style={{ visibility: 'visible', position: 'fixed', bottom: '10px', zIndex: 10 }}
    >
      <UserInfo onOpenProfile={onOpenProfile} />
      <AdminButton />
      <ImageInfo onOpenImageInfo={onOpenImageInfo} />
      <StatsDisplay />
      <AIScore onOpenConfusionMatrix={onOpenConfusionMatrix} />
      <AIRecommendation />
    </div>
  );
};

export default SegmentationStatusBar;

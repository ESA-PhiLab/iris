import React from 'react';
import { useViewManagerStore } from '../../../stores/viewManagerStore';

interface ImageInfoProps {
  onOpenImageInfo: () => void;
}

const ImageInfo: React.FC<ImageInfoProps> = ({ onOpenImageInfo }) => {
  // Use store hook instead of direct window access
  const { imageId } = useViewManagerStore();
  
  return (
    <div
      className="statusbutton"
      style={{ minWidth: '150px' }}
      onClick={onOpenImageInfo}
      id="image-info"
    >
      <div className="info-box-top">{imageId || 'Loading...'}</div>
      <div className="info-box-bottom">image-ID</div>
    </div>
  );
};

export default ImageInfo;

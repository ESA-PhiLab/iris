import React from 'react';
import ToolButton from './ToolButton';
import { useSegmentationStore } from '../../../stores/segmentationStore';

const MaskTools: React.FC = () => {
  // PHASE 1: Use store hooks for both mask visibility and mask type
  const { showMask, toggleMask, maskType, setMaskType } = useSegmentationStore();
  
  return (
    <>
      <ToolButton
        id="tb_toggle_mask"
        icon="/segmentation/static/icons/show_mask.png"
        checked={showMask}
        onClick={toggleMask}
      />
      <ToolButton
        id="tb_mask_final"
        icon="/segmentation/static/icons/mask_final.png"
        checked={maskType === 'final'}
        onClick={() => setMaskType('final')}
      />
      <ToolButton
        id="tb_mask_user"
        icon="/segmentation/static/icons/mask_user.png"
        checked={maskType === 'user'}
        onClick={() => setMaskType('user')}
      />
      <ToolButton
        id="tb_mask_errors"
        icon="/segmentation/static/icons/mask_errors.png"
        checked={maskType === 'errors'}
        onClick={() => setMaskType('errors')}
      />
    </>
  );
};

export default MaskTools;

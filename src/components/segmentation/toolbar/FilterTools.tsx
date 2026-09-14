import React from 'react';
import ToolButton from './ToolButton';
import FilterSlider from './FilterSlider';
import { useSegmentationStore } from '../../../stores/segmentationStore';

const FilterTools: React.FC = () => {
  const {
    brightness,
    saturation,
    contrast,
    invert,
    setBrightness,
    setSaturation,
    setContrast,
    setInvert,
    resetFilters,
    changeBrightness,
    changeSaturation,
  } = useSegmentationStore();

  return (
    <>
      <FilterSlider
        id="tb_brightness"
        label="Brightness"
        value={brightness}
        min={0}
        max={800}
        step={10}
        icon="/segmentation/static/icons/brightness_up.png"
        onChange={setBrightness}
        onIncrease={() => changeBrightness(true)}
        onDecrease={() => changeBrightness(false)}
      />
      
      <FilterSlider
        id="tb_saturation"
        label="Saturation"
        value={saturation}
        min={0}
        max={800}
        step={20}
        icon="/segmentation/static/icons/saturation_up.png"
        onChange={setSaturation}
        onIncrease={() => changeSaturation(true)}
        onDecrease={() => changeSaturation(false)}
      />
      
      <ToolButton
        id="tb_toggle_contrast"
        icon="/segmentation/static/icons/contrast.png"
        className={contrast ? 'checked' : ''}
        onClick={() => setContrast(!contrast)}
        title={`Contrast: ${contrast ? 'On' : 'Off'}`}
      />
      
      <ToolButton
        id="tb_toggle_invert"
        icon="/segmentation/static/icons/invert.png"
        className={invert ? 'checked' : ''}
        onClick={() => setInvert(!invert)}
        title={`Invert: ${invert ? 'On' : 'Off'}`}
      />
      
      <ToolButton
        id="tb_reset_filters"
        icon="/segmentation/static/icons/reset_filters.png"
        onClick={resetFilters}
        title="Reset all filters"
      />
    </>
  );
};

export default FilterTools;

import React from 'react';
import ToolButton from './ToolButton';
import { useSegmentationStore } from '../../../stores/segmentationStore';

interface FilterSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  icon: string;
  onChange: (value: number) => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

const FilterSlider: React.FC<FilterSliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  icon,
  onChange,
  onIncrease,
  onDecrease,
}) => {
  const { expandedFilterSlider, setExpandedFilterSlider } = useSegmentationStore();
  const isExpanded = expandedFilterSlider === id;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="filter-slider-container">
      <ToolButton
        id={`${id}_toggle`}
        icon={icon}
        onClick={() => setExpandedFilterSlider(isExpanded ? null : id)}
        className={isExpanded ? 'expanded' : ''}
        title={`${label}: ${value}`}
      />
      
      {isExpanded && (
        <div className="filter-slider-panel">
          <div className="filter-slider-header">
            <span className="filter-label">{label}</span>
            <span className="filter-value">{value}</span>
          </div>
          
          <div className="filter-slider-controls">
            <button
              className="filter-btn filter-btn-decrease"
              onClick={onDecrease}
              title={`Decrease ${label}`}
            >
              −
            </button>
            
            <input
              type="range"
              className="filter-slider"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleSliderChange}
            />
            
            <button
              className="filter-btn filter-btn-increase"
              onClick={onIncrease}
              title={`Increase ${label}`}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSlider;
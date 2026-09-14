import React, { useRef, useEffect } from 'react';
import ToolButton from './ToolButton';
import { useSegmentationStore } from '../../../stores/segmentationStore';

interface PaintbrushSelectorProps {
  id: string;
  icon: string;
  checked?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  dropdownType: 'draw' | 'eraser';
  label?: string;
  style?: React.CSSProperties;
}

const PaintbrushSelector: React.FC<PaintbrushSelectorProps> = ({
  id,
  icon,
  checked = false,
  onClick,
  disabled = false,
  title,
  dropdownType,
  label,
  style,
}) => {
  const { 
    showDrawToolDropdown,
    showEraserToolDropdown,
    setShowDrawToolDropdown,
    setShowEraserToolDropdown,
    toolShape, 
    setToolShape, 
    toolSize, 
    setToolSize 
  } = useSegmentationStore();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Determine which dropdown state to use based on type
  const showDropdown = dropdownType === 'draw' ? showDrawToolDropdown : showEraserToolDropdown;
  const setShowDropdown = dropdownType === 'draw' ? setShowDrawToolDropdown : setShowEraserToolDropdown;

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.right + 8, // 8px margin to the right of the button
    };
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, setShowDropdown]);

  const handleButtonClick = () => {
    // First execute the original onClick (to select the tool)
    if (onClick) {
      onClick();
    }
    // Then toggle the dropdown
    setShowDropdown(!showDropdown);
  };

  const handleShapeSelect = (shape: 'square' | 'round', size: number) => {
    setToolShape(shape);
    setToolSize(size);
    setShowDropdown(false);
  };

  // Size options for both square and round brushes
  const sizeOptions = [1, 3, 5, 10, 15, 20];
  
  const dropdownPosition = getDropdownPosition();

  return (
    <div className="paintbrush-selector-container" ref={buttonRef}>
      <ToolButton
        id={id}
        icon={icon}
        checked={checked}
        onClick={handleButtonClick}
        disabled={disabled}
        title={title}
        className={showDropdown ? 'dropdown-open' : ''}
        label={label}
        style={style}
      />
      
      {showDropdown && (
        <div 
          className="paintbrush-dropdown" 
          ref={dropdownRef}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="paintbrush-dropdown-header">
            <span>Select Brush Shape & Size</span>
          </div>
          
          {/* Square brushes row */}
          <div className="brush-row">
            <div className="brush-row-label">Square</div>
            <div className="brush-options">
              {sizeOptions.map((size) => (
                <button
                  key={`square-${size}`}
                  className={`brush-option ${toolShape === 'square' && toolSize === size ? 'selected' : ''}`}
                  onClick={() => handleShapeSelect('square', size)}
                  title={`Square brush, ${size}px`}
                >
                  <div 
                    className="brush-preview square"
                    style={{
                      width: `${Math.min(size * 2, 24)}px`,
                      height: `${Math.min(size * 2, 24)}px`,
                    }}
                  />
                  <span className="brush-size-label">{size}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Round brushes row */}
          <div className="brush-row">
            <div className="brush-row-label">Round</div>
            <div className="brush-options">
              {sizeOptions.map((size) => (
                <button
                  key={`round-${size}`}
                  className={`brush-option ${toolShape === 'round' && toolSize === size ? 'selected' : ''}`}
                  onClick={() => handleShapeSelect('round', size)}
                  title={`Round brush, ${size}px`}
                >
                  <div 
                    className="brush-preview round"
                    style={{
                      width: `${Math.min(size * 2, 24)}px`,
                      height: `${Math.min(size * 2, 24)}px`,
                    }}
                  />
                  <span className="brush-size-label">{size}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaintbrushSelector;
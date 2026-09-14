import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ToolButtonProps {
  id?: string;
  icon: string;
  onClick: () => void;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  children?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  id,
  icon,
  onClick,
  title,
  className = '',
  style,
  testId,
  children,
  checked = false,
  disabled = false,
  label
}) => {
  const { theme, actualThemeName } = useTheme();
  
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  const buttonClassName = `toolbutton icon_button ${className} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`.trim();

  // Determine if we're in dark theme
  const isDarkTheme = actualThemeName === 'dark';
  
  // Icon filter logic:
  // Light theme: checked = no filter (black), unchecked = invert (white)
  // Dark theme: checked = invert (white), unchecked = invert (white)
  const iconFilter = isDarkTheme
    ? 'invert(1) brightness(0.9)' // Dark theme: always white
    : (checked ? 'none' : 'invert(1) brightness(0.9)'); // Light theme: black when checked, white when unchecked

  return (
    <li
      id={id}
      className={buttonClassName}
      onClick={handleClick}
      title={title}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: label ? 'flex-start' : 'center',
        padding: label ? '6px 10px' : '6px',
        minHeight: '32px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        margin: '0',
        backgroundColor: checked ? theme.toolbarActive : theme.toolbarHover,
        border: `1px solid ${checked ? theme.toolbarActive : 'transparent'}`,
        borderRadius: '6px',
        transition: 'all 0.2s ease',
        ...style,
      }}
      data-testid={testId}
    >
      <img 
        src={icon} 
        className="icon" 
        alt="" 
        style={{ 
          flexShrink: 0, 
          width: '18px', 
          height: '18px',
          filter: iconFilter,
        }} 
      />
      {label && (
        <span style={{ 
          color: theme.toolbarText, 
          fontSize: '13px', 
          fontWeight: checked ? '600' : '500',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {label}
        </span>
      )}
      {children}
    </li>
  );
};

export default ToolButton;

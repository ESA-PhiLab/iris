import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { ShortcutName, tooltip } from '../../../utils/shortcuts';
import { controlButtonStyle, controlIconFilter } from '../../controlStyles';

interface ToolButtonProps {
  id?: string;
  /** Path of a black PNG icon, or an icon drawn in the colour of the text */
  icon: string | React.ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  children?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  /** Shortcut shown in the tooltip */
  shortcut?: ShortcutName;
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
  label,
  shortcut,
}) => {
  const { theme, actualThemeName } = useTheme();
  const [hovered, setHovered] = React.useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  const buttonClassName = `toolbutton icon_button ${className} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`.trim();

  // Same look as the buttons of the side panel
  const iconFilter = controlIconFilter(actualThemeName === 'dark', checked);

  return (
    <li
      id={id}
      className={buttonClassName}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...(title ? tooltip(title, shortcut) : {})}
      style={{
        ...controlButtonStyle(theme, { active: checked, hovered: hovered && !disabled }),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        justifyContent: label ? 'flex-start' : 'center',
        padding: label ? '0 10px' : '0',
        minHeight: '34px',
        width: '100%',
        maxWidth: '100%',
        margin: '0',
        ...style,
      }}
      data-testid={testId}
    >
      {typeof icon === 'string' ? (
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
      ) : (
        <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      )}
      {label && (
        <span style={{ 
          fontSize: '13px', 
          textAlign: 'left',
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

import React, { useEffect } from 'react';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import { useTheme } from '../../contexts/ThemeContext';
import { ShortcutName, tooltip } from '../../utils/shortcuts';
import { useShortcut } from '../../hooks/useShortcut';
import { controlButtonStyle } from '../controlStyles';
import Sidebar, { SidebarGroup } from './Sidebar';
import ToolButton from './toolbar/ToolButton';
import { GlobeIcon, ImageIcon } from '../icons/ToolbarIcons';

const FOLDED_SECTIONS_KEY = 'iris-right-panel-folded';

/** Sections of the panel the user folded, remembered across reloads */
const readFoldedSections = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(FOLDED_SECTIONS_KEY) || '{}');
  } catch {
    return {};
  }
};

/** Section of the panel whose title (or shortcut) folds and unfolds it */
const Section: React.FC<{
  title: string;
  shortcut?: ShortcutName;
  last?: boolean;
  children: React.ReactNode;
}> = ({ title, shortcut, last = false, children }) => {
  const { theme } = useTheme();
  const [folded, setFolded] = React.useState(() => Boolean(readFoldedSections()[title]));

  const toggle = () => {
    const next = !folded;
    setFolded(next);
    try {
      localStorage.setItem(
        FOLDED_SECTIONS_KEY, JSON.stringify({ ...readFoldedSections(), [title]: next })
      );
    } catch { /* ignore */ }
  };
  useShortcut(shortcut, toggle);

  const action = `${folded ? 'Show' : 'Hide'} ${title.toLowerCase()}`;
  return (
    <section style={{
      padding: '14px 0',
      borderBottom: last ? 'none' : `1px solid ${theme.panelBorder}`,
    }}>
      <button
        onClick={toggle}
        aria-expanded={!folded}
        {...tooltip(action, shortcut)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.gray600,
        }}
      >
        <span style={{
          display: 'inline-block',
          width: '10px',
          fontSize: '10px',
          transform: folded ? 'rotate(-90deg)' : 'none',
          transition: 'transform 0.15s ease',
        }}>▾</span>
        <span style={{
          flex: 1,
          textAlign: 'left',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>{title}</span>
      </button>
      {!folded && <div style={{ marginTop: '12px' }}>{children}</div>}
    </section>
  );
};

/** Label on the left, control on the right, with the tooltip of the control */
const Row: React.FC<{
  label: string;
  hint?: string;
  shortcut?: ShortcutName;
  children: React.ReactNode;
}> = ({ label, hint, shortcut, children }) => {
  const { theme } = useTheme();
  return (
    <div
      {...(hint ? tooltip(hint, shortcut) : {})}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minHeight: '30px',
        color: theme.gray600,
      }}
    >
      <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: theme.gray900 }}>{label}</span>
      {children}
    </div>
  );
};

/** On/off switch */
const Switch: React.FC<{ on: boolean; onToggle: () => void; label: string }> = ({ on, onToggle, label }) => {
  const { theme } = useTheme();
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: '34px',
        height: '20px',
        padding: 0,
        backgroundColor: on ? theme.toggleOn : theme.toggleOff,
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      }}
    >
      <span style={{
        position: 'absolute',
        top: '2px',
        left: on ? '16px' : '2px',
        width: '16px',
        height: '16px',
        backgroundColor: theme.toggleThumb,
        borderRadius: '50%',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
        transition: 'left 0.2s ease',
      }} />
    </button>
  );
};

/** Slider of an adjustment in percent */
const Slider: React.FC<{
  label: string;
  shortcut: ShortcutName;
  value: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, shortcut, value, step, onChange }) => {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom: '10px' }}>
      <Row label={label} hint={label} shortcut={shortcut}>
        <span style={{
          minWidth: '38px',
          textAlign: 'right',
          fontSize: '12px',
          fontVariantNumeric: 'tabular-nums',
          color: theme.gray600,
        }}>{value}%</span>
      </Row>
      <input
        type="range"
        min="0"
        max="800"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{
          width: '100%',
          height: '4px',
          margin: '8px 0 4px',
          borderRadius: '2px',
          // Filled up to the value, the thumb is styled in segmentation.css
          background: `linear-gradient(to right, ${theme.sliderTrackFilled} ${(value / 800) * 100}%, ${theme.sliderTrack} ${(value / 800) * 100}%)`,
          cursor: 'pointer',
        }}
      />
    </div>
  );
};

/** Button that stays highlighted while its option is on */
const PanelButton: React.FC<{
  label: string;
  shortcut: ShortcutName;
  title: string;
  active?: boolean;
  onClick: () => void;
}> = ({ label, shortcut, title, active = false, onClick }) => {
  const { theme } = useTheme();
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      {...tooltip(title, shortcut)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...controlButtonStyle(theme, { active, hovered }), flex: 1, minHeight: '34px' }}
    >
      {label}
    </button>
  );
};

interface RightPanelProps {
  expanded: boolean;
  onToggle: () => void;
  onSelectClass: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ expanded, onToggle, onSelectClass }) => {
  const { theme } = useTheme();

  const {
    showMask,
    toggleMask,
    maskType,
    setMaskType,
    brightness,
    saturation,
    contrast,
    invert,
    setBrightness,
    setSaturation,
    setContrast,
    setInvert,
    resetFilters,
    currentClass,
    classes,
  } = useSegmentationStore();
  const { showImage, showSatellite, toggleImage, toggleSatellite } = useViewManagerStore();

  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

  useShortcut('toggleImage', toggleImage);
  useShortcut('toggleSatellite', toggleSatellite);

  const currentClassConfig = currentClass >= 0 && currentClass < classes.length
    ? classes[currentClass]
    : null;

  // Watch for showMask changes and trigger canvas update
  // Note: maskType changes are handled in the store's setMaskType function
  useEffect(() => {
    const w = window as any;
    // Only call if function exists and vars is initialized
    if (w.vars && w.show_mask) {
      try {
        w.show_mask(showMask);
      } catch (error) {
        console.error('[RightPanel] Error toggling mask visibility:', error);
      }
    }
  }, [showMask]);

  // Watch for filter changes and apply them
  useEffect(() => {
    const w = window as any;
    if (w.renderFromStore) {
      try {
        w.renderFromStore();
      } catch (error) {
        console.error('[RightPanel] Error applying filters:', error);
      }
    }
  }, [brightness, saturation, contrast, invert]);

  const maskTypes: Array<{ value: 'final' | 'user' | 'errors'; label: string; title: string; shortcut: ShortcutName }> = [
    { value: 'final', label: 'Final', title: 'Final mask', shortcut: 'maskFinal' },
    { value: 'user', label: 'User', title: 'User mask', shortcut: 'maskUser' },
    { value: 'errors', label: 'Errors', title: 'Error mask', shortcut: 'maskErrors' },
  ];

  const swatch = (
    <span style={{
      display: 'inline-block',
      width: '14px',
      height: '14px',
      flexShrink: 0,
      borderRadius: '3px',
      border: `1px solid ${theme.panelBorder}`,
      backgroundColor: currentClassConfig
        ? `rgba(${currentClassConfig.colour.slice(0, 3).join(',')}, ${Math.max(currentClassConfig.colour[3] / 255, 0.15)})`
        : 'transparent',
    }} />
  );
  const className = currentClassConfig ? currentClassConfig.name : 'No class';
  const icons = '/segmentation/static/icons';

  return (
    <Sidebar side="right" expanded={expanded} onToggle={onToggle} name="options" shortcut="rightPanel">
      {expanded ? (
        <div style={{ padding: '0 14px' }}>
          {/* Class */}
          <Section title="Class">
            <button
              onClick={onSelectClass}
              onMouseEnter={() => setHoveredButton('class')}
              onMouseLeave={() => setHoveredButton(null)}
              {...tooltip('Select class, or press 1..9', 'classDialog')}
              style={{
                ...controlButtonStyle(theme, { hovered: hoveredButton === 'class' }),
                justifyContent: 'flex-start',
                gap: '10px',
                width: '100%',
                minHeight: '36px',
                fontSize: '13px',
              }}
            >
              {swatch}
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 500 }}>{className}</span>
            </button>
          </Section>

          {/* Layers */}
          <Section title="Layers" shortcut="foldLayers">
            <Row label="Mask" hint="Show or hide the mask" shortcut="toggleMask">
              <Switch on={showMask} onToggle={toggleMask} label="Mask" />
            </Row>
            <Row label="Image" hint="Show or hide the image" shortcut="toggleImage">
              <Switch on={showImage} onToggle={toggleImage} label="Image" />
            </Row>
            <Row label="Satellite" hint="Show or hide the satellite imagery" shortcut="toggleSatellite">
              <Switch on={showSatellite} onToggle={toggleSatellite} label="Satellite" />
            </Row>

            <div style={{ marginTop: '10px', fontSize: '11px', color: theme.gray600 }}>Mask type</div>
            <div style={{
              display: 'flex',
              gap: '2px',
              marginTop: '6px',
              padding: '2px',
              backgroundColor: theme.segmentedBg,
              borderRadius: '6px',
            }}>
              {maskTypes.map((option) => {
                const selected = maskType === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setMaskType(option.value)}
                    aria-pressed={selected}
                    {...tooltip(option.title, option.shortcut)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '30px',
                      padding: '0 4px',
                      backgroundColor: selected ? theme.segmentedActive : 'transparent',
                      color: selected ? theme.gray900 : theme.gray600,
                      border: 'none',
                      borderRadius: '4px',
                      boxShadow: selected ? '0 1px 2px rgba(0, 0, 0, 0.15)' : 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: selected ? 600 : 500,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Adjustments */}
          <Section title="Adjustments" shortcut="foldAdjustments" last>
            <Slider label="Brightness" shortcut="brightness" value={brightness} step={10} onChange={setBrightness} />
            <Slider label="Saturation" shortcut="saturation" value={saturation} step={20} onChange={setSaturation} />

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <PanelButton label="Contrast" shortcut="contrast" title="Toggle contrast" active={contrast} onClick={() => setContrast(!contrast)} />
              <PanelButton label="Invert" shortcut="invert" title="Toggle invert" active={invert} onClick={() => setInvert(!invert)} />
            </div>
            <div style={{ display: 'flex', marginTop: '8px' }}>
              <PanelButton label="Reset adjustments" shortcut="resetFilters" title="Reset the adjustments" onClick={resetFilters} />
            </div>
          </Section>
        </div>
      ) : (
        <>
          {/* The same options as icon buttons, like the collapsed toolbar */}
          <SidebarGroup expanded={false}>
            <ToolButton icon={swatch} onClick={onSelectClass} title={`Class: ${className}`} shortcut="classDialog" />
          </SidebarGroup>
          <SidebarGroup expanded={false}>
            <ToolButton icon={`${icons}/show_mask.png`} checked={showMask} onClick={toggleMask} title="Show or hide the mask" shortcut="toggleMask" />
            <ToolButton icon={<ImageIcon size={18} />} checked={showImage} onClick={toggleImage} title="Show or hide the image" shortcut="toggleImage" />
            <ToolButton icon={<GlobeIcon size={18} />} checked={showSatellite} onClick={toggleSatellite} title="Show or hide the satellite imagery" shortcut="toggleSatellite" />
          </SidebarGroup>
          <SidebarGroup expanded={false}>
            {maskTypes.map((option) => (
              <ToolButton
                key={option.value}
                icon={`${icons}/mask_${option.value}.png`}
                checked={maskType === option.value}
                onClick={() => setMaskType(option.value)}
                title={option.title}
                shortcut={option.shortcut}
              />
            ))}
          </SidebarGroup>
          <SidebarGroup expanded={false} last>
            <ToolButton icon={`${icons}/brightness_up.png`} onClick={() => setBrightness(brightness + 10)} title="Brightness +10%" shortcut="brightness" />
            <ToolButton icon={`${icons}/brightness_down.png`} onClick={() => setBrightness(brightness - 10)} title="Brightness -10%" shortcut="brightness" />
            <ToolButton icon={`${icons}/saturation_up.png`} onClick={() => setSaturation(saturation + 20)} title="Saturation +20%" shortcut="saturation" />
            <ToolButton icon={`${icons}/saturation_down.png`} onClick={() => setSaturation(saturation - 20)} title="Saturation -20%" shortcut="saturation" />
            <ToolButton icon={`${icons}/contrast.png`} checked={contrast} onClick={() => setContrast(!contrast)} title="Toggle contrast" shortcut="contrast" />
            <ToolButton icon={`${icons}/invert.png`} checked={invert} onClick={() => setInvert(!invert)} title="Toggle invert" shortcut="invert" />
            <ToolButton icon={`${icons}/reset_filters.png`} onClick={resetFilters} title="Reset the adjustments" shortcut="resetFilters" />
          </SidebarGroup>
        </>
      )}
    </Sidebar>
  );
};

export default RightPanel;

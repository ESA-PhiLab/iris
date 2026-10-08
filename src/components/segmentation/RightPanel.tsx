import React, { useEffect } from 'react';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import { useTheme } from '../../contexts/ThemeContext';
import { ShortcutName, tooltip } from '../../utils/shortcuts';
import { useShortcut } from '../../hooks/useShortcut';

export const PANEL_WIDTH = 264;
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
        style={{ width: '100%', margin: '2px 0 0', accentColor: theme.toggleOn, cursor: 'pointer' }}
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
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: '32px',
        padding: '0 10px',
        backgroundColor: active
          ? theme.buttonPrimaryBg
          : hovered ? theme.buttonSecondaryHover : theme.buttonSecondaryBg,
        color: active ? theme.buttonPrimaryText : theme.buttonSecondaryText,
        border: `1px solid ${active ? theme.buttonPrimaryBg : theme.buttonSecondaryBorder}`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 500,
        transition: 'background-color 0.15s ease',
      }}
    >
      {label}
    </button>
  );
};

interface RightPanelProps {
  onSelectClass: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ onSelectClass, isCollapsed, onToggleCollapse }) => {
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

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        {...tooltip('Show panel', 'rightPanel')}
        style={{
          position: 'fixed',
          right: 0,
          top: '62px',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 6px',
          backgroundColor: theme.panelBg,
          color: theme.gray600,
          border: `1px solid ${theme.panelBorder}`,
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.12)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '12px' }}>◀</span>
      </button>
    );
  }

  return (
    <aside
      style={{
        position: 'fixed',
        right: 0,
        top: '50px',
        bottom: '60px',
        width: `${PANEL_WIDTH}px`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.panelBg,
        borderLeft: `1px solid ${theme.panelBorder}`,
        zIndex: 900,
        boxSizing: 'border-box',
      }}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '44px',
        flexShrink: 0,
        padding: '0 12px 0 16px',
        borderBottom: `1px solid ${theme.panelBorder}`,
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: theme.gray900 }}>Options</span>
        <button
          onClick={onToggleCollapse}
          {...tooltip('Hide panel', 'rightPanel')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '26px',
            padding: '0 8px',
            background: 'none',
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: '6px',
            color: theme.gray600,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Hide
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {/* Class */}
        <Section title="Class">
          <button
            onClick={onSelectClass}
            {...tooltip('Select class, or press 1..9', 'classDialog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              height: '36px',
              padding: '0 10px',
              backgroundColor: theme.buttonSecondaryBg,
              color: theme.buttonSecondaryText,
              border: `1px solid ${theme.buttonSecondaryBorder}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <span style={{
              width: '14px',
              height: '14px',
              flexShrink: 0,
              borderRadius: '3px',
              border: `1px solid ${theme.panelBorder}`,
              backgroundColor: currentClassConfig
                ? `rgba(${currentClassConfig.colour.slice(0, 3).join(',')}, ${Math.max(currentClassConfig.colour[3] / 255, 0.15)})`
                : 'transparent',
            }} />
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 500 }}>
              {currentClassConfig ? currentClassConfig.name : 'No class'}
            </span>
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
                    gap: '5px',
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
    </aside>
  );
};

export default RightPanel;

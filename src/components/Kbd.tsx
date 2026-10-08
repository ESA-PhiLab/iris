import React from 'react';
import { SHORTCUTS, ShortcutName } from '../utils/shortcuts';

/**
 * Key of a keyboard shortcut, shown next to its control
 *
 * The colours are translucent so the key reads on any background, also
 * inside highlighted buttons.
 */
const Kbd: React.FC<{ name?: ShortcutName; children?: React.ReactNode }> = ({ name, children }) => (
  <kbd
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      minWidth: '18px',
      height: '18px',
      padding: '0 5px',
      boxSizing: 'border-box',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '10px',
      fontWeight: 500,
      lineHeight: 1,
      color: 'inherit',
      opacity: 0.75,
      backgroundColor: 'rgba(127, 127, 127, 0.14)',
      border: '1px solid rgba(127, 127, 127, 0.35)',
      borderBottomWidth: '2px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
    }}
  >
    {children ?? (name ? SHORTCUTS[name].key : null)}
  </kbd>
);

export default Kbd;

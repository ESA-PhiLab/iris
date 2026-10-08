import type React from 'react';
import type { ColorScheme } from '../themes/colorschemes';

/**
 * Look of the buttons of the toolbar and the side panel, so both sides match:
 * a raised secondary button, highlighted with the primary colour while its
 * tool or option is on.
 */
export const controlButtonStyle = (
  theme: ColorScheme,
  { active = false, hovered = false }: { active?: boolean; hovered?: boolean } = {}
): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  minHeight: '32px',
  padding: '0 10px',
  boxSizing: 'border-box',
  backgroundColor: active
    ? theme.buttonPrimaryBg
    : hovered ? theme.buttonSecondaryHover : theme.buttonSecondaryBg,
  color: active ? theme.buttonPrimaryText : theme.buttonSecondaryText,
  border: `1px solid ${active ? theme.buttonPrimaryBg : theme.buttonSecondaryBorder}`,
  borderRadius: '6px',
  boxShadow: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
});

/** The icons are black, invert them where the button is dark */
export const controlIconFilter = (darkTheme: boolean, active: boolean) =>
  darkTheme !== active ? 'invert(1) brightness(0.9)' : 'none';

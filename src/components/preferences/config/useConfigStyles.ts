import { useTheme } from '../../../contexts/ThemeContext';
import type { ColorScheme } from '../../../themes/colorschemes';

/**
 * Shared themed styles for all Configuration tab section components.
 * Returns style objects that override legacy CSS classes with theme colors.
 */
export function useConfigStyles() {
  const { theme } = useTheme();
  return getConfigStyles(theme);
}

export function getConfigStyles(theme: ColorScheme) {
  return {
    theme,
    accordionStyle: {
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', border: `1px solid ${theme.modalBorder}`,
      backgroundColor: theme.bgTertiary, color: theme.gray900,
      cursor: 'pointer', fontSize: '14px', fontWeight: 600 as const,
      outline: 'none', textAlign: 'left' as const, margin: '0',
      overflow: 'visible', transition: 'background-color 0.15s ease',
      borderRadius: '8px',
    } as React.CSSProperties,
    accordionOpenStyle: {
      borderRadius: '8px 8px 0 0',
    } as React.CSSProperties,
    panelStyle: {
      padding: '16px', border: `1px solid ${theme.modalBorder}`, borderTop: 'none',
      borderRadius: '0 0 8px 8px', backgroundColor: theme.bgSecondary,
      marginBottom: '8px',
    } as React.CSSProperties,
    labelStyle: {
      display: 'block', marginBottom: '4px', fontWeight: 600 as const,
      color: theme.gray900, fontSize: '14px',
    } as React.CSSProperties,
    descriptionStyle: {
      display: 'block', color: theme.gray600, marginBottom: '8px',
      lineHeight: '1.5', fontSize: '12px',
    } as React.CSSProperties,
    codeStyle: {
      color: theme.primary, fontSize: '12px',
    } as React.CSSProperties,
    preStyle: {
      background: theme.bgTertiary, padding: '8px', borderRadius: '6px',
      fontSize: '12px', marginBottom: '8px', color: theme.gray900,
      border: `1px solid ${theme.modalBorder}`,
    } as React.CSSProperties,
    inputStyle: {
      width: '100%', padding: '8px 10px', borderRadius: '6px',
      border: `1px solid ${theme.inputBorder}`, backgroundColor: theme.inputBg,
      color: theme.inputText, fontSize: '13px', outline: 'none',
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
    selectStyle: {
      width: '100%', padding: '8px 10px', borderRadius: '6px',
      border: `1px solid ${theme.inputBorder}`, backgroundColor: theme.inputBg,
      color: theme.inputText, fontSize: '13px', outline: 'none', cursor: 'pointer',
      appearance: 'auto' as const, WebkitAppearance: 'menulist' as const,
      fontWeight: 'normal' as const, boxShadow: 'none',
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
    buttonPrimary: {
      padding: '8px 14px', borderRadius: '6px', border: 'none',
      backgroundColor: theme.buttonPrimaryBg, color: theme.buttonPrimaryText,
      fontSize: '13px', fontWeight: 500 as const, cursor: 'pointer',
    } as React.CSSProperties,
    buttonDanger: {
      padding: '6px 12px', borderRadius: '6px',
      border: `1px solid ${theme.alert}`, backgroundColor: 'transparent',
      color: theme.alert, fontSize: '12px', cursor: 'pointer',
    } as React.CSSProperties,
    buttonDashed: {
      width: '100%', padding: '10px', borderRadius: '6px',
      border: `2px dashed ${theme.primary}`, backgroundColor: 'transparent',
      color: theme.primary, fontSize: '13px', cursor: 'pointer', fontWeight: 500 as const,
    } as React.CSSProperties,
    sectionBox: {
      marginBottom: '20px', padding: '12px', borderRadius: '6px',
      backgroundColor: theme.bgTertiary, border: `1px solid ${theme.modalBorder}`,
    } as React.CSSProperties,
    infoBox: {
      marginTop: '16px', padding: '12px', borderRadius: '6px',
      backgroundColor: theme.primaryPale, border: `1px solid ${theme.primary}`,
      fontSize: '13px', color: theme.gray900,
    } as React.CSSProperties,
    errorText: {
      fontSize: '12px', color: theme.alert, marginTop: '6px',
    } as React.CSSProperties,
    tableStyle: {
      width: '100%', borderCollapse: 'collapse' as const,
      border: `1px solid ${theme.modalBorder}`, borderRadius: '6px',
      overflow: 'hidden', boxShadow: 'none',
    } as React.CSSProperties,
    tdStyle: {
      padding: '10px 12px', border: `1px solid ${theme.modalBorder}`,
      color: theme.gray900, fontSize: '13px', textAlign: 'left' as const,
    } as React.CSSProperties,
  };
}

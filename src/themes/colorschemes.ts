/**
 * IRIS Theme System - Color Definitions
 * 
 * This file contains the complete color definitions for both Light (Sunset) and Dark (Midnight) themes.
 * All color values are taken directly from IRIS_COLORSCHEMES.md - DO NOT MODIFY.
 */

export interface ColorScheme {
  // Primary Colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLight: string;
  primaryPale: string;
  primaryDark?: string; // Only in dark theme
  
  // Secondary Colors
  secondary: string;
  secondaryHover: string;
  secondaryActive: string;
  secondaryLight: string;
  secondaryPale: string;
  secondaryDark?: string; // Only in dark theme
  
  // Accent Colors
  accent: string;
  accentHover: string;
  accentActive: string;
  
  // Alert/Warning Colors
  alert: string;
  alertHover: string;
  alertActive: string;
  alertLight: string;
  alertPale: string;
  alertDark?: string; // Only in dark theme
  
  // Success Colors
  success: string;
  successHover: string;
  successLight: string;
  successDark?: string; // Only in dark theme
  
  // Neutral Grays
  gray900: string;
  gray800: string;
  gray700: string;
  gray600: string;
  gray500: string;
  gray400: string;
  gray300: string;
  gray200: string;
  gray100: string;
  gray50: string;
  
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCanvas: string;
  
  // Toolbar & Panels
  toolbarBg: string;
  toolbarBgLight: string; // Lighter variant for bottom bar
  toolbarText: string;
  toolbarBorder: string;
  toolbarHover: string;
  toolbarActive: string;
  panelBg: string;
  panelBorder: string;
  panelHeaderBg: string;
  
  // Buttons
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonPrimaryHover: string;
  buttonPrimaryActive: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  buttonSecondaryBorder: string;
  buttonSecondaryHover: string;
  buttonDangerBg: string;
  buttonDangerText: string;
  buttonDangerHover: string;
  
  // Form Elements
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  inputText: string;
  inputPlaceholder: string;
  
  // Sliders
  sliderTrack: string;
  sliderTrackFilled: string;
  sliderThumb: string;
  sliderThumbHover: string;
  
  // Toggles/Switches
  toggleOff: string;
  toggleOn: string;
  toggleThumb: string;
  
  // Modals & Overlays
  modalBg: string;
  modalHeaderBg: string;
  modalBorder: string;
  modalOverlay: string;
  
  // Tabs
  tabInactive: string;
  tabActive: string;
  tabActiveBg: string;
  tabBorder: string;
  tabHover: string;
  
  // Segmented Controls
  segmentedBg: string;
  segmentedActive: string;
  segmentedBorder: string;
  
  // Tooltips
  tooltipBg: string;
  tooltipText: string;
  
  // Status Colors
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;
  
  // Mask Layer Colors
  maskFinal: string;
  maskUser: string;
  maskError: string;
  
  // Special UI Elements
  separatorColor: string;
  focusRing: string;
  selectionBg: string;
  canvasBorder: string;
  canvasGridLine: string;
}

/**
 * Light Theme ("Sunset")
 * Warm, approachable tones with teal blue, soft yellow, peach, and coral
 */
export const lightTheme: ColorScheme = {
  // Primary Colors
  primary: '#5B9AA9',
  primaryHover: '#4A8897',
  primaryActive: '#3A7785',
  primaryLight: '#7DB3C0',
  primaryPale: '#E8F3F5',
  
  // Secondary Colors
  secondary: '#F5B895',
  secondaryHover: '#F3A67D',
  secondaryActive: '#F19465',
  secondaryLight: '#F9D4BE',
  secondaryPale: '#FEF5F0',
  
  // Accent Colors
  accent: '#F4D58D',
  accentHover: '#F2CA75',
  accentActive: '#F0BF5D',
  
  // Alert/Warning Colors
  alert: '#F08A8A',
  alertHover: '#ED7272',
  alertActive: '#EA5A5A',
  alertLight: '#F9C5C5',
  alertPale: '#FEF0F0',
  
  // Success Colors
  success: '#6BBF8D',
  successHover: '#5AAF7D',
  successLight: '#B8E5CA',
  
  // Neutral Grays (warm-tinted)
  gray900: '#2D3E4F',
  gray800: '#3D4E5F',
  gray700: '#4D5E6F',
  gray600: '#6B7C8D',
  gray500: '#8B9CAD',
  gray400: '#ABB8C5',
  gray300: '#CBD5DD',
  gray200: '#E5EBF0',
  gray100: '#F2F5F8',
  gray50: '#F9FAFB',
  
  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgTertiary: '#F2F5F8',
  bgCanvas: '#FAFBFC',
  
  // Toolbar & Panels
  toolbarBg: '#5B9AA9',
  toolbarBgLight: '#6DAAB8', // Lighter teal for bottom bar
  toolbarText: '#FFFFFF',
  toolbarBorder: 'rgba(255, 255, 255, 0.3)',
  toolbarHover: 'rgba(255, 255, 255, 0.15)',
  toolbarActive: 'rgba(255, 255, 255, 0.25)',
  panelBg: '#F9FAFB',
  panelBorder: '#E5EBF0',
  panelHeaderBg: '#F2F5F8',
  
  // Buttons
  buttonPrimaryBg: '#5B9AA9',
  buttonPrimaryText: '#FFFFFF',
  buttonPrimaryHover: '#4A8897',
  buttonPrimaryActive: '#3A7785',
  buttonSecondaryBg: '#FFFFFF',
  buttonSecondaryText: '#2D3E4F',
  buttonSecondaryBorder: '#CBD5DD',
  buttonSecondaryHover: '#F9FAFB',
  buttonDangerBg: '#F08A8A',
  buttonDangerText: '#FFFFFF',
  buttonDangerHover: '#ED7272',
  
  // Form Elements
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5DD',
  inputBorderFocus: '#5B9AA9',
  inputText: '#2D3E4F',
  inputPlaceholder: '#8B9CAD',
  
  // Sliders
  sliderTrack: '#E5EBF0',
  sliderTrackFilled: '#5B9AA9',
  sliderThumb: '#5B9AA9',
  sliderThumbHover: '#4A8897',
  
  // Toggles/Switches
  toggleOff: '#CBD5DD',
  toggleOn: '#5B9AA9',
  toggleThumb: '#FFFFFF',
  
  // Modals & Overlays
  modalBg: '#FFFFFF',
  modalHeaderBg: '#F2F5F8',
  modalBorder: '#E5EBF0',
  modalOverlay: 'rgba(45, 62, 79, 0.5)',
  
  // Tabs
  tabInactive: '#8B9CAD',
  tabActive: '#2D3E4F',
  tabActiveBg: '#FFFFFF',
  tabBorder: '#E5EBF0',
  tabHover: '#F9FAFB',
  
  // Segmented Controls
  segmentedBg: '#F2F5F8',
  segmentedActive: '#FFFFFF',
  segmentedBorder: '#E5EBF0',
  
  // Tooltips
  tooltipBg: '#2D3E4F',
  tooltipText: '#FFFFFF',
  
  // Status Colors
  statusSuccess: '#6BBF8D',
  statusWarning: '#F4D58D',
  statusError: '#F08A8A',
  statusInfo: '#5B9AA9',
  
  // Mask Layer Colors
  maskFinal: '#5B9AA9',
  maskUser: '#F5B895',
  maskError: '#F08A8A',
  
  // Special UI Elements
  separatorColor: '#E5EBF0',
  focusRing: '#5B9AA9',
  selectionBg: '#E8F3F5',
  canvasBorder: '#CBD5DD',
  canvasGridLine: '#E5EBF0',
};

/**
 * Dark Theme ("Midnight")
 * Sophisticated, modern tones with soft pink, deep navy, dark teal, and bright teal
 */
export const darkTheme: ColorScheme = {
  // Primary Colors
  primary: '#5DAFB8',
  primaryHover: '#6FC5CE',
  primaryActive: '#81D5DD',
  primaryLight: '#6FC5CE',
  primaryPale: '#2D5F6D',
  primaryDark: '#4A9BA4',
  
  // Secondary Colors
  secondary: '#F5B8D0',
  secondaryHover: '#F8C9DD',
  secondaryActive: '#FBDAE9',
  secondaryLight: '#F8C9DD',
  secondaryPale: '#3D2A35',
  secondaryDark: '#E3A6BE',
  
  // Accent Colors
  accent: '#F5B8D0',
  accentHover: '#F8C9DD',
  accentActive: '#FBDAE9',
  
  // Alert/Warning Colors
  alert: '#F5B8D0',
  alertHover: '#F8C9DD',
  alertActive: '#FBDAE9',
  alertLight: '#F8C9DD',
  alertPale: '#3D2A35',
  alertDark: '#E3A6BE',
  
  // Success Colors
  success: '#6DCEA8',
  successHover: '#7FD8B5',
  successLight: '#7FD8B5',
  successDark: '#5BB896',
  
  // Neutral Grays (cool-tinted)
  gray900: '#E8EDF2',
  gray800: '#D4DCE5',
  gray700: '#B8C4D0',
  gray600: '#9CAAB8',
  gray500: '#7A8A9C',
  gray400: '#5A6A7C',
  gray300: '#3E4E60',
  gray200: '#2D3E50',
  gray100: '#1F2D3D',
  gray50: '#1A2332',
  
  // Backgrounds
  bgPrimary: '#1A2332',
  bgSecondary: '#1F2D3D',
  bgTertiary: '#2D3E50',
  bgCanvas: '#151E2A',
  
  // Toolbar & Panels
  toolbarBg: '#1A2332',
  toolbarBgLight: '#242F40', // Lighter navy for bottom bar
  toolbarText: '#E8EDF2',
  toolbarBorder: 'rgba(232, 237, 242, 0.2)',
  toolbarHover: 'rgba(232, 237, 242, 0.1)',
  toolbarActive: 'rgba(232, 237, 242, 0.15)',
  panelBg: '#1F2D3D',
  panelBorder: '#3E4E60',
  panelHeaderBg: '#2D3E50',
  
  // Buttons
  buttonPrimaryBg: '#5DAFB8',
  buttonPrimaryText: '#1A2332',
  buttonPrimaryHover: '#6FC5CE',
  buttonPrimaryActive: '#81D5DD',
  buttonSecondaryBg: '#2D3E50',
  buttonSecondaryText: '#E8EDF2',
  buttonSecondaryBorder: '#3E4E60',
  buttonSecondaryHover: '#3E4E60',
  buttonDangerBg: '#F5B8D0',
  buttonDangerText: '#1A2332',
  buttonDangerHover: '#F8C9DD',
  
  // Form Elements
  inputBg: '#2D3E50',
  inputBorder: '#3E4E60',
  inputBorderFocus: '#5DAFB8',
  inputText: '#E8EDF2',
  inputPlaceholder: '#7A8A9C',
  
  // Sliders
  sliderTrack: '#3E4E60',
  sliderTrackFilled: '#5DAFB8',
  sliderThumb: '#5DAFB8',
  sliderThumbHover: '#6FC5CE',
  
  // Toggles/Switches
  toggleOff: '#3E4E60',
  toggleOn: '#5DAFB8',
  toggleThumb: '#E8EDF2',
  
  // Modals & Overlays
  modalBg: '#1F2D3D',
  modalHeaderBg: '#2D3E50',
  modalBorder: '#3E4E60',
  modalOverlay: 'rgba(21, 30, 42, 0.7)',
  
  // Tabs
  tabInactive: '#7A8A9C',
  tabActive: '#E8EDF2',
  tabActiveBg: '#2D3E50',
  tabBorder: '#3E4E60',
  tabHover: '#2D3E50',
  
  // Segmented Controls
  segmentedBg: '#2D3E50',
  segmentedActive: '#3E4E60',
  segmentedBorder: '#3E4E60',
  
  // Tooltips
  tooltipBg: '#E8EDF2',
  tooltipText: '#1A2332',
  
  // Status Colors
  statusSuccess: '#6DCEA8',
  statusWarning: '#F5B8D0',
  statusError: '#F5B8D0',
  statusInfo: '#5DAFB8',
  
  // Mask Layer Colors
  maskFinal: '#5DAFB8',
  maskUser: '#F5B8D0',
  maskError: '#F5B8D0',
  
  // Special UI Elements
  separatorColor: '#3E4E60',
  focusRing: '#5DAFB8',
  selectionBg: '#2D5F6D',
  canvasBorder: '#3E4E60',
  canvasGridLine: '#2D3E50',
};

/**
 * Theme name type
 */
export type ThemeName = 'light' | 'dark' | 'system';

/**
 * Get theme colors based on theme name
 * Resolves 'system' to actual theme based on OS preference
 */
export function getThemeColors(themeName: ThemeName): ColorScheme {
  if (themeName === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? darkTheme : lightTheme;
  }
  return themeName === 'dark' ? darkTheme : lightTheme;
}

/**
 * Get actual theme name (resolves 'system' to 'light' or 'dark')
 */
export function getActualThemeName(themeName: ThemeName): 'light' | 'dark' {
  if (themeName === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return themeName;
}

/**
 * IRIS Theme Context
 * 
 * Provides theme management for the IRIS segmentation interface.
 * Handles OS theme detection, user preferences, and CSS custom property application.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ColorScheme, ThemeName, getThemeColors, getActualThemeName } from '../themes/colorschemes';

interface ThemeContextValue {
  theme: ColorScheme;
  themeName: ThemeName;
  actualThemeName: 'light' | 'dark';
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'iris-theme-preference';

/**
 * Convert camelCase to kebab-case for CSS variable names
 */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Apply theme colors as CSS custom properties on document root
 */
function applyThemeToDOM(colors: ColorScheme, actualTheme: 'light' | 'dark'): void {
  const root = document.documentElement;
  
  // Set data-theme attribute for CSS selectors
  root.setAttribute('data-theme', actualTheme);
  
  // Apply all color tokens as CSS variables
  Object.entries(colors).forEach(([key, value]) => {
    const cssVarName = `--color-${camelToKebab(key)}`;
    root.style.setProperty(cssVarName, value);
  });
}

/**
 * Load theme preference from localStorage
 */
function loadThemePreference(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to load theme preference from localStorage:', error);
  }
  return 'system'; // Default to system preference
}

/**
 * Save theme preference to localStorage
 */
function saveThemePreference(themeName: ThemeName): void {
  try {
    localStorage.setItem(STORAGE_KEY, themeName);
  } catch (error) {
    console.warn('Failed to save theme preference to localStorage:', error);
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  // Load initial theme preference
  const [themeName, setThemeNameState] = useState<ThemeName>(() => loadThemePreference());
  
  // Calculate actual theme and colors
  const actualThemeName = getActualThemeName(themeName);
  const theme = getThemeColors(themeName);
  
  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(theme, actualThemeName);
  }, [theme, actualThemeName]);
  
  // Listen for OS theme changes when preference is 'system'
  useEffect(() => {
    if (themeName !== 'system') {
      return;
    }
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newActualTheme = e.matches ? 'dark' : 'light';
      const newColors = e.matches ? getThemeColors('dark') : getThemeColors('light');
      applyThemeToDOM(newColors, newActualTheme);
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [themeName]);
  
  // Set theme and persist to localStorage
  const setTheme = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    saveThemePreference(name);
  }, []);
  
  const value: ThemeContextValue = {
    theme,
    themeName,
    actualThemeName,
    setTheme,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * Must be used within ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

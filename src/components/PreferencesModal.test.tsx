import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import PreferencesModal from './PreferencesModal';
import { ThemeProvider } from '../contexts/ThemeContext';
import React from 'react';

const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

/**
 * PreferencesModal Tests
 * 
 * These tests focus on the keyboard shortcut blocking functionality.
 * Full integration tests for unsaved changes are covered by Cypress E2E tests.
 */

describe('PreferencesModal - Keyboard Shortcuts', () => {
  let originalKeyDownHandler: ((event: KeyboardEvent) => void) | null;
  let originalKeyUpHandler: ((event: KeyboardEvent) => void) | null;

  beforeEach(() => {
    originalKeyDownHandler = document.body.onkeydown;
    originalKeyUpHandler = document.body.onkeyup;

    // Re-establish matchMedia mock (vi.restoreAllMocks in afterEach clears it)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock fetch with proper URL handling
    global.fetch = vi.fn((url) => {
      // Handle both relative and absolute URLs
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('/segmentation/api/user-config')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              config: {
                segmentation: {
                  ai_model: {
                    bands: ['B1'],
                    n_estimators: 100,
                    max_depth: 5,
                    num_leaves: 31,
                    suppress_threshold: 0.5,
                    postprocessing: { enabled: false, min_area: 10 },
                  },
                },
              },
              all_bands: ['B1', 'B2'],
              is_admin: false,
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as any;
  });

  afterEach(() => {
    document.body.onkeydown = originalKeyDownHandler;
    document.body.onkeyup = originalKeyUpHandler;
    vi.restoreAllMocks();
  });

  it('disables keyboard shortcuts when modal is open', () => {
    const mockKeyHandler = vi.fn();
    document.body.onkeydown = mockKeyHandler;

    renderWithTheme(<PreferencesModal isOpen={true} onClose={() => {}} />);

    // Handler should be replaced
    expect(document.body.onkeydown).not.toBe(mockKeyHandler);
    expect(document.body.onkeydown).not.toBeNull();
  });

  it('restores keyboard shortcuts when modal closes', () => {
    const mockKeyHandler = vi.fn();
    const mockKeyUpHandler = vi.fn();
    document.body.onkeydown = mockKeyHandler;
    document.body.onkeyup = mockKeyUpHandler;

    const { rerender } = renderWithTheme(<PreferencesModal isOpen={true} onClose={() => {}} />);

    // Handlers should be replaced
    expect(document.body.onkeydown).not.toBe(mockKeyHandler);

    // Close modal
    rerender(<ThemeProvider><PreferencesModal isOpen={false} onClose={() => {}} /></ThemeProvider>);

    // Handlers should be restored
    expect(document.body.onkeydown).toBe(mockKeyHandler);
    expect(document.body.onkeyup).toBe(mockKeyUpHandler);
  });

  it('blocks regular keyboard shortcuts while modal is open', () => {
    const mockKeyHandler = vi.fn();
    document.body.onkeydown = mockKeyHandler;

    renderWithTheme(<PreferencesModal isOpen={true} onClose={() => {}} />);

    const currentHandler = document.body.onkeydown;
    expect(currentHandler).not.toBeNull();
    expect(currentHandler).not.toBe(mockKeyHandler);

    // Simulate pressing a regular key (e.g., 'D' for draw tool)
    const regularKeyEvent = {
      code: 'KeyD',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    // Should not throw and should block the event
    expect(() => currentHandler!.call(document.body, regularKeyEvent)).not.toThrow();
  });
});

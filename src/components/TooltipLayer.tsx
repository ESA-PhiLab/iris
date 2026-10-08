import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Kbd from './Kbd';

const DELAY_MS = 150;
const GAP = 8;

interface Tip {
  label: string;
  shortcut?: string;
  rect: DOMRect;
}

/**
 * Tooltip of the control under the mouse
 *
 * Controls opt in with the props of tooltip() in utils/shortcuts.ts. One layer
 * serves the whole page, and it shows up quicker than the browser's own
 * tooltips. It sits beside the side bars and below or above the top and
 * bottom bars, wherever the control is.
 */
const TooltipLayer: React.FC = () => {
  const { theme } = useTheme();
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let current: HTMLElement | null = null;
    let timer: number | undefined;

    const hide = () => {
      current = null;
      window.clearTimeout(timer);
      setTip(null);
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.('[data-tooltip]') as HTMLElement | null;
      if (target === current) return;
      hide();
      if (!target) return;
      current = target;
      timer = window.setTimeout(() => {
        if (current !== target || !target.isConnected) return;
        setTip({
          label: target.dataset.tooltip || '',
          shortcut: target.dataset.shortcut,
          rect: target.getBoundingClientRect(),
        });
      }, DELAY_MS);
    };

    const onPointerOut = (event: PointerEvent) => {
      // Leaving the window
      if (!event.relatedTarget) hide();
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);

  if (!tip) return null;

  const { rect } = tip;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const centerX = Math.min(Math.max(rect.left + rect.width / 2, 120), width - 120);
  const centerY = rect.top + rect.height / 2;

  let position: React.CSSProperties;
  if (rect.top > height - 70) {
    // Bottom bar: above
    position = { left: centerX, bottom: height - rect.top + GAP, transform: 'translateX(-50%)' };
  } else if (rect.bottom < 60) {
    // Top bar: below
    position = { left: centerX, top: rect.bottom + GAP, transform: 'translateX(-50%)' };
  } else if (rect.right < width * 0.25) {
    // Left toolbar: to the right
    position = { left: rect.right + GAP, top: centerY, transform: 'translateY(-50%)' };
  } else if (rect.left > width * 0.6) {
    // Side panel: to the left
    position = { right: width - rect.left + GAP, top: centerY, transform: 'translateY(-50%)' };
  } else {
    position = { left: centerX, top: rect.bottom + GAP, transform: 'translateX(-50%)' };
  }

  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        ...position,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: '260px',
        padding: '6px 8px 6px 10px',
        backgroundColor: theme.panelBg,
        color: theme.gray900,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: 1.3,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tip.label}</span>
      {tip.shortcut && <Kbd>{tip.shortcut}</Kbd>}
    </div>
  );
};

export default TooltipLayer;

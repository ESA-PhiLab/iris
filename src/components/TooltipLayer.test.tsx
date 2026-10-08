import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TooltipLayer from './TooltipLayer';
import { ThemeProvider } from '../contexts/ThemeContext';
import { tooltip } from '../utils/shortcuts';

const renderPage = () => render(
  <ThemeProvider>
    <button {...tooltip('Draw pixels', 'draw')}>draw</button>
    <button>plain</button>
    <TooltipLayer />
  </ThemeProvider>
);

describe('TooltipLayer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows what a control does and its shortcut when the mouse is over it', () => {
    vi.useFakeTimers();
    renderPage();

    fireEvent.pointerOver(screen.getByText('draw'));
    act(() => { vi.advanceTimersByTime(200); });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Draw pixels');
    expect(screen.getByRole('tooltip')).toHaveTextContent('D');
  });

  it('hides when the mouse moves to a control without tooltip', () => {
    vi.useFakeTimers();
    renderPage();

    fireEvent.pointerOver(screen.getByText('draw'));
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerOver(screen.getByText('plain'));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides when clicking', () => {
    vi.useFakeTimers();
    renderPage();

    fireEvent.pointerOver(screen.getByText('draw'));
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerDown(screen.getByText('draw'));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

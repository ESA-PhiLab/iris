import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ViewsTab from './ViewsTab';
import { ThemeProvider } from '../../contexts/ThemeContext';

const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('ViewsTab', () => {
  it('renders without crashing', () => {
    renderWithTheme(<ViewsTab />);
    expect(screen.getByText('Not yet implemented.')).toBeInTheDocument();
  });
});

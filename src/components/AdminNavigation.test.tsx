import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminNavigation from './AdminNavigation';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AdminNavigation', () => {
  it('renders preferences button that links to segmentation with openPreferences parameter', () => {
    renderWithRouter(<AdminNavigation />);

    const preferencesLink = screen.getByTitle('Preferences') as HTMLAnchorElement;
    expect(preferencesLink).toBeInTheDocument();
    expect(preferencesLink.href).toContain('/segmentation?openPreferences=true');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import SettingsTools from './SettingsTools';

describe('SettingsTools', () => {
  it('renders help and preferences buttons', () => {
    render(
      <SettingsTools
        onOpenHelp={vi.fn()}
        onOpenPreferences={vi.fn()}
      />
    );
    
    expect(screen.getByTestId('preferences-button')).toBeInTheDocument();
  });

  it('calls onOpenPreferences when preferences button is clicked', () => {
    const handlePreferences = vi.fn();
    render(
      <SettingsTools
        onOpenHelp={vi.fn()}
        onOpenPreferences={handlePreferences}
      />
    );
    
    fireEvent.click(screen.getByTestId('preferences-button'));
    expect(handlePreferences).toHaveBeenCalledTimes(1);
  });
});

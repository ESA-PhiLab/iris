import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Band Selector Component
 * 
 * Multi-select dropdown for choosing image bands.
 * Used in the dual-listbox band selection interface.
 */
interface BandSelectorProps {
  bands: string[];
  onSelectionChange: (selected: string[]) => void;
  id?: string;
  'data-testid'?: string;
}

const BandSelector: React.FC<BandSelectorProps> = ({ 
  bands, 
  onSelectionChange, 
  id = 'bands-selector',
  'data-testid': dataTestId
}) => {
  const { theme } = useTheme();

  return (
    <select
      id={id}
      data-testid={dataTestId}
      size={10}
      multiple
      style={{
        width: '100%', height: '200px', padding: '4px',
        borderRadius: '6px', border: `1px solid ${theme.inputBorder}`,
        backgroundColor: theme.inputBg, color: theme.inputText,
        fontSize: '13px', outline: 'none',
        // Reset legacy CSS overrides
        display: 'block', fontWeight: 'normal', boxShadow: 'none',
        appearance: 'auto', WebkitAppearance: 'listbox',
      }}
      onChange={(e) => {
        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
        onSelectionChange(selected);
      }}
    >
      {bands.map(band => (
        <option key={band} value={band}>
          {band}
        </option>
      ))}
    </select>
  );
};

export default BandSelector;

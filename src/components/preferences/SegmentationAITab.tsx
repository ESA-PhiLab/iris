import React, { useState } from 'react';
import { UserConfig, AIModelConfig } from '../../types/iris';
import BandSelector from './BandSelector';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Segmentation AI Tab Component
 * 
 * Contains three accordion sections:
 * 1. Model Parameters - LightGBM model configuration
 * 2. Model Inputs - Feature selection (bands, edge filter, meshgrid, superpixels)
 * 3. Postprocessing - Suppression filter settings
 */
interface SegmentationAITabProps {
  config: UserConfig;
  allBands: string[];
  updateAIModelConfig: (key: keyof AIModelConfig, value: any) => void;
  moveBands: (from: 'included' | 'excluded', selectedBands: string[]) => void;
}

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { theme } = useTheme();

  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={isOpen ? 'accordion checked' : 'accordion'}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: isOpen ? '8px 8px 0 0' : '8px',
          border: `1px solid ${theme.modalBorder}`, backgroundColor: theme.bgTertiary,
          cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: theme.gray900,
          transition: 'all 0.15s ease', outline: 'none',
          // Reset legacy CSS overrides
          textAlign: 'left' as const, margin: 0, overflow: 'visible',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.panelHeaderBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.bgTertiary)}
      >
        <span>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.gray500}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={{
          padding: '16px', border: `1px solid ${theme.modalBorder}`, borderTop: 'none',
          borderRadius: '0 0 8px 8px', backgroundColor: theme.bgSecondary,
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

const SegmentationAITab: React.FC<SegmentationAITabProps> = ({
  config,
  allBands,
  updateAIModelConfig,
  moveBands,
}) => {
  const { theme } = useTheme();

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: `1px solid ${theme.separatorColor}`,
    gap: '16px',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '13px', color: theme.gray900, fontWeight: 500, flex: '1 1 auto',
  };
  const numberInputStyle: React.CSSProperties = {
    width: '70px', padding: '6px 8px', borderRadius: '6px',
    border: `1px solid ${theme.inputBorder}`, backgroundColor: theme.inputBg,
    color: theme.inputText, fontSize: '13px', textAlign: 'center', outline: 'none',
  };
  const sliderStyle: React.CSSProperties = {
    width: '100%', height: '6px', borderRadius: '3px',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundColor: theme.sliderTrack, outline: 'none',
    cursor: 'pointer', marginTop: '6px',
  };
  const selectStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: '6px',
    border: `1px solid ${theme.inputBorder}`, backgroundColor: theme.inputBg,
    color: theme.inputText, fontSize: '13px', outline: 'none', cursor: 'pointer',
    appearance: 'auto', WebkitAppearance: 'listbox',
    // Reset legacy CSS overrides
    display: 'inline-block', width: 'auto', maxWidth: 'none',
    fontWeight: 'normal', boxShadow: 'none', margin: 0,
  };
  const checkboxLabelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
  };

  return (
    <div data-testid="segmentation-ai-tab">
      {/* Model Parameters */}
      <AccordionSection title="Model Parameters">
        <div style={rowStyle}>
          <span style={labelStyle}>Number of estimators</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 220px' }}>
            <input type="number" data-testid="input-n-estimators" min="10" max="200"
              value={config.segmentation.ai_model.n_estimators}
              onChange={(e) => updateAIModelConfig('n_estimators', parseInt(e.target.value) || 10)}
              style={numberInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
            />
            <input type="range" min="10" max="200" style={sliderStyle}
              value={config.segmentation.ai_model.n_estimators}
              onChange={(e) => updateAIModelConfig('n_estimators', parseInt(e.target.value))}
            />
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Maximal depth</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 220px' }}>
            <input type="number" data-testid="input-max-depth" min="5" max="100"
              value={config.segmentation.ai_model.max_depth}
              onChange={(e) => updateAIModelConfig('max_depth', parseInt(e.target.value) || 5)}
              style={numberInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
            />
            <input type="range" min="5" max="100" style={sliderStyle}
              value={config.segmentation.ai_model.max_depth}
              onChange={(e) => updateAIModelConfig('max_depth', parseInt(e.target.value))}
            />
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Number of leaves</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 220px' }}>
            <input type="number" data-testid="input-n-leaves" min="5" max="100"
              value={config.segmentation.ai_model.n_leaves}
              onChange={(e) => updateAIModelConfig('n_leaves', parseInt(e.target.value) || 5)}
              style={numberInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
            />
            <input type="range" min="5" max="100" style={sliderStyle}
              value={config.segmentation.ai_model.n_leaves}
              onChange={(e) => updateAIModelConfig('n_leaves', parseInt(e.target.value))}
            />
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Train ratio</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="number" min="10" max="100"
                value={Math.round(config.segmentation.ai_model.train_ratio * 100)}
                onChange={(e) => updateAIModelConfig('train_ratio', (parseInt(e.target.value) || 10) / 100)}
                style={numberInputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
                onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
              />
              <span style={{ fontSize: '13px', color: theme.gray600 }}>%</span>
            </div>
            <input type="range" min="10" max="100" style={sliderStyle}
              value={config.segmentation.ai_model.train_ratio * 100}
              onChange={(e) => updateAIModelConfig('train_ratio', parseInt(e.target.value) / 100)}
            />
          </div>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Max. training pixels per class</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 220px' }}>
            <input type="number" min="100" max="50000"
              value={config.segmentation.ai_model.max_train_pixels}
              onChange={(e) => updateAIModelConfig('max_train_pixels', parseInt(e.target.value) || 100)}
              style={{ ...numberInputStyle, width: '80px' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
            />
            <input type="range" min="100" max="50000" style={sliderStyle}
              value={config.segmentation.ai_model.max_train_pixels}
              onChange={(e) => updateAIModelConfig('max_train_pixels', parseInt(e.target.value))}
            />
          </div>
        </div>
      </AccordionSection>

      {/* Model Inputs */}
      <AccordionSection title="Model Inputs">
        <div style={rowStyle}>
          <span style={labelStyle}>Use edge filter?</span>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" data-testid="checkbox-use-edge-filter"
              checked={config.segmentation.ai_model.use_edge_filter}
              onChange={(e) => updateAIModelConfig('use_edge_filter', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </label>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Use meshgrid?</span>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" data-testid="checkbox-use-meshgrid"
              checked={config.segmentation.ai_model.use_meshgrid}
              onChange={(e) => updateAIModelConfig('use_meshgrid', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </label>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Meshgrid cells</span>
          <select data-testid="select-meshgrid-cells" style={selectStyle}
            value={config.segmentation.ai_model.meshgrid_cells}
            onChange={(e) => updateAIModelConfig('meshgrid_cells', e.target.value)}
          >
            {['3x3', '5x5', '7x7', '10x10', '20x20', 'pixelwise'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Use superpixels?</span>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" data-testid="checkbox-use-superpixels"
              checked={config.segmentation.ai_model.use_superpixels}
              onChange={(e) => updateAIModelConfig('use_superpixels', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: theme.primary, cursor: 'pointer' }}
            />
          </label>
        </div>
        <div style={{ paddingTop: '12px', borderBottom: 'none' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: theme.gray900, marginBottom: '10px' }}>
            Input bands
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: theme.gray600, marginBottom: '6px', fontWeight: 500 }}>
                Bands to include
              </div>
              <BandSelector
                bands={config.segmentation.ai_model.bands}
                onSelectionChange={() => {}}
                id="bands-included"
                data-testid="select-bands-included"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
              <button
                data-testid="button-move-bands-left"
                onClick={() => {
                  const excludedSelect = document.getElementById('bands-excluded') as HTMLSelectElement;
                  const selected = Array.from(excludedSelect.selectedOptions).map((opt) => opt.value);
                  moveBands('excluded', selected);
                }}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: `1px solid ${theme.buttonSecondaryBorder}`,
                  backgroundColor: theme.buttonSecondaryBg, color: theme.buttonSecondaryText,
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
              >
                &lt;
              </button>
              <button
                data-testid="button-move-bands-right"
                onClick={() => {
                  const includedSelect = document.getElementById('bands-included') as HTMLSelectElement;
                  const selected = Array.from(includedSelect.selectedOptions).map((opt) => opt.value);
                  moveBands('included', selected);
                }}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: `1px solid ${theme.buttonSecondaryBorder}`,
                  backgroundColor: theme.buttonSecondaryBg, color: theme.buttonSecondaryText,
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.buttonSecondaryBg)}
              >
                &gt;
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: theme.gray600, marginBottom: '6px', fontWeight: 500 }}>
                Bands to exclude
              </div>
              <BandSelector
                bands={allBands.filter((band) => !config.segmentation.ai_model.bands.includes(band))}
                onSelectionChange={() => {}}
                id="bands-excluded"
                data-testid="select-bands-excluded"
              />
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Postprocessing */}
      <AccordionSection title="Postprocessing">
        <div style={rowStyle}>
          <span style={labelStyle}>Suppression filter size</span>
          <select data-testid="select-suppression-filter-size" style={selectStyle}
            value={config.segmentation.ai_model.suppression_filter_size}
            onChange={(e) => updateAIModelConfig('suppression_filter_size', parseInt(e.target.value))}
          >
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="7">7</option>
          </select>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Suppression filter threshold</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="number" data-testid="input-suppression-threshold" min="0" max="100"
                value={Math.round((config.segmentation.ai_model.suppression_threshold || 0) * 100)}
                onChange={(e) => updateAIModelConfig('suppression_threshold', (parseInt(e.target.value) || 0) / 100)}
                style={numberInputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
                onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
              />
              <span style={{ fontSize: '13px', color: theme.gray600 }}>%</span>
            </div>
            <input type="range" min="0" max="100" style={sliderStyle}
              value={Math.round((config.segmentation.ai_model.suppression_threshold || 0) * 100)}
              onChange={(e) => updateAIModelConfig('suppression_threshold', parseInt(e.target.value) / 100)}
            />
          </div>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Suppression background class</span>
          <select style={selectStyle}
            value={config.segmentation.ai_model.suppression_default_class}
            onChange={(e) => updateAIModelConfig('suppression_default_class', parseInt(e.target.value))}
          >
            {config.classes.map((cls, index) => (
              <option key={index} value={index} style={{ backgroundColor: cls.css_colour }}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </AccordionSection>
    </div>
  );
};

export default SegmentationAITab;

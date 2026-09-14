import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SegmentationAITab from './SegmentationAITab';
import { UserConfig } from '../../types/iris';
import { ThemeProvider } from '../../contexts/ThemeContext';

const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

const mockConfig: UserConfig = {
  segmentation: {
    ai_model: {
      bands: ['B1', 'B2'],
      n_estimators: 100,
      n_leaves: 31,
      max_depth: -1,
      train_ratio: 0.8,
      max_train_pixels: 10000,
      suppression_threshold: 0.5,
      suppression_filter_size: 5,
      suppression_default_class: 0,
      use_edge_filter: false,
      use_meshgrid: false,
      meshgrid_cells: '5x5',
      use_superpixels: false,
    },
  },
  classes: [
    { name: 'Class 1', css_colour: '#ff0000', colour: [255, 0, 0, 255] as [number, number, number, number] },
    { name: 'Class 2', css_colour: '#00ff00', colour: [0, 255, 0, 255] as [number, number, number, number] },
  ],
};

describe('SegmentationAITab', () => {
  it('renders the AI configuration sections', () => {
    renderWithTheme(
      <SegmentationAITab
        config={mockConfig}
        allBands={['B1', 'B2', 'B3', 'B4']}
        updateAIModelConfig={vi.fn()}
        moveBands={vi.fn()}
      />
    );

    expect(screen.getByText('Model Parameters')).toBeInTheDocument();
    expect(screen.getByText('Postprocessing')).toBeInTheDocument();
    expect(screen.getByText('Model Inputs')).toBeInTheDocument();
  });

  it('displays model parameter values', () => {
    renderWithTheme(
      <SegmentationAITab
        config={mockConfig}
        allBands={['B1', 'B2', 'B3', 'B4']}
        updateAIModelConfig={vi.fn()}
        moveBands={vi.fn()}
      />
    );

    const nEstimatorsInput = screen.getByTestId('input-n-estimators') as HTMLInputElement;
    expect(nEstimatorsInput.value).toBe('100');
  });

  it('renders with themed styling', () => {
    const { container } = renderWithTheme(
      <SegmentationAITab
        config={mockConfig}
        allBands={['B1', 'B2', 'B3', 'B4']}
        updateAIModelConfig={vi.fn()}
        moveBands={vi.fn()}
      />
    );
    const div = container.querySelector('[data-testid="segmentation-ai-tab"]');
    expect(div).toBeInTheDocument();
  });
});

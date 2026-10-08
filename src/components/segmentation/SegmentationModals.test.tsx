import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test/test-utils';
import SegmentationModals from './SegmentationModals';
import { Backend, setBackend } from '../../services/backend';

const loadPreferences = vi.fn();
setBackend({ loadPreferences } as unknown as Backend);

describe('SegmentationModals', () => {
  beforeEach(() => {
    loadPreferences.mockResolvedValue({
      config: {
        segmentation: {
          ai_model: {
            bands: ['B1'],
            n_estimators: 100,
            max_depth: 10,
            n_leaves: 31,
            post_process: true,
            suppress_threshold: 0.5,
            suppression_default_class: 0
          }
        },
        classes: [
          { name: 'Background', css_colour: '#000000' },
          { name: 'Cloud', css_colour: '#ffffff' }
        ]
      },
      allBands: ['B1', 'B2', 'B3', 'B4'],
      isAdmin: false
    });
  });
  const mockProps = {
    isPreferencesOpen: false,
    onClosePreferences: vi.fn(),
    isProfileOpen: false,
    onCloseProfile: vi.fn(),
    isLoginOpen: false,
    isHelpOpen: false,
    onCloseHelp: vi.fn(),
    isResetMaskOpen: false,
    onCloseResetMask: vi.fn(),
    onConfirmResetMask: vi.fn(),
    isClassSelectionOpen: false,
    onCloseClassSelection: vi.fn(),
    isImageInfoOpen: false,
    onCloseImageInfo: vi.fn(),
    isConfusionMatrixOpen: false,
    onCloseConfusionMatrix: vi.fn(),
  };

  it('renders without crashing', async () => {
    await act(async () => {
      render(<SegmentationModals {...mockProps} />);
    });
    expect(document.body).toBeInTheDocument();
  });

  it('shows preferences modal when open', async () => {
    await act(async () => {
      render(<SegmentationModals {...mockProps} isPreferencesOpen={true} />);
    });
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('shows help modal when open', async () => {
    await act(async () => {
      render(<SegmentationModals {...mockProps} isHelpOpen={true} />);
    });
    expect(screen.getByText('Help')).toBeInTheDocument();
  });
});

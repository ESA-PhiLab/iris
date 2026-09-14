import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import AIScore from './AIScore';
import { useSegmentationStore } from '../../../stores/segmentationStore';

// Mock the store
vi.mock('../../../stores/segmentationStore');

describe('AIScore', () => {
  const mockUseSegmentationStore = vi.mocked(useSegmentationStore);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AI score with default value when no confusion matrix', () => {
    mockUseSegmentationStore.mockReturnValue(null);
    
    render(<AIScore onOpenConfusionMatrix={vi.fn()} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('AI Score')).toBeInTheDocument();
  });

  it('renders AI score from confusion matrix when available', () => {
    const mockConfusionMatrix = {
      matrix: [[10, 2], [1, 15]],
      classCount: 2,
      totalSamples: 28,
      accuracyStats: {
        overall: 0.89,
        perClass: [0.83, 0.94],
        worstClass: 0,
        worstAccuracy: 0.83,
        truePositives: { 0: 10, 1: 15 }
      },
      timestamp: new Date(),
      classes: ['Clear', 'Cloud']
    };
    
    mockUseSegmentationStore.mockReturnValue(mockConfusionMatrix);
    
    render(<AIScore onOpenConfusionMatrix={vi.fn()} />);
    
    expect(screen.getByText('89%')).toBeInTheDocument();
  });

  it('calls onOpenConfusionMatrix when clicked', () => {
    mockUseSegmentationStore.mockReturnValue(null);
    const handleOpenMatrix = vi.fn();
    
    render(<AIScore onOpenConfusionMatrix={handleOpenMatrix} />);
    
    fireEvent.click(screen.getByTitle('View confusion matrix and accuracy statistics'));
    expect(handleOpenMatrix).toHaveBeenCalledTimes(1);
  });
});

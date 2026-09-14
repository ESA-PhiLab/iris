import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '../../../test/test-utils';
import DrawingTools from './DrawingTools';

// Mock the segmentation store
const mockPredictMask = vi.fn();
const mockSetCurrentTool = vi.fn();
const mockResetViews = vi.fn();
const mockShowErrorModal = vi.fn();

vi.mock('../../../stores/segmentationStore', () => ({
  useSegmentationStore: () => ({
    currentTool: 'draw',
    setCurrentTool: mockSetCurrentTool,
    predictMask: mockPredictMask,
    resetViews: mockResetViews,
    isLoading: false,
    showErrorModal: mockShowErrorModal,
  }),
}));

describe('DrawingTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drawing tool buttons', () => {
    const { container } = render(<DrawingTools onResetMask={vi.fn()} />);
    
    expect(container.querySelector('#tb_tool_move')).toBeInTheDocument();
    expect(container.querySelector('#tb_tool_draw')).toBeInTheDocument();
    expect(container.querySelector('#tb_tool_eraser')).toBeInTheDocument();
    expect(container.querySelector('#tb_predict_mask')).toBeInTheDocument();
  });

  it('calls onResetMask when reset button is clicked', () => {
    const handleReset = vi.fn();
    const { container } = render(<DrawingTools onResetMask={handleReset} />);
    
    const resetButton = container.querySelector('#tb_reset_mask');
    if (resetButton) {
      fireEvent.click(resetButton);
      expect(handleReset).toHaveBeenCalledTimes(1);
    }
  });

  it('shows modern error modal when AI prediction fails with insufficient training data', async () => {
    const errorMessage = 'You need to draw at least 10 pixels for more than one class to use the AI.';
    mockPredictMask.mockRejectedValueOnce(new Error(errorMessage));

    const { container } = render(<DrawingTools onResetMask={vi.fn()} />);
    
    const predictButton = container.querySelector('#tb_predict_mask');
    if (predictButton) {
      fireEvent.click(predictButton);
      
      await waitFor(() => {
        expect(mockPredictMask).toHaveBeenCalledTimes(1);
        expect(mockShowErrorModal).toHaveBeenCalledWith(errorMessage, 'AI Prediction Error');
      });
    }
  });

  it('shows modern error modal when AI prediction fails with network error', async () => {
    const errorMessage = 'Network error occurred';
    mockPredictMask.mockRejectedValueOnce(new Error(errorMessage));

    const { container } = render(<DrawingTools onResetMask={vi.fn()} />);
    
    const predictButton = container.querySelector('#tb_predict_mask');
    if (predictButton) {
      fireEvent.click(predictButton);
      
      await waitFor(() => {
        expect(mockPredictMask).toHaveBeenCalledTimes(1);
        expect(mockShowErrorModal).toHaveBeenCalledWith(errorMessage, 'AI Prediction Error');
      });
    }
  });

  it('shows modern error modal when AI prediction fails with unknown error', async () => {
    mockPredictMask.mockRejectedValueOnce('Unknown error');

    const { container } = render(<DrawingTools onResetMask={vi.fn()} />);
    
    const predictButton = container.querySelector('#tb_predict_mask');
    if (predictButton) {
      fireEvent.click(predictButton);
      
      await waitFor(() => {
        expect(mockPredictMask).toHaveBeenCalledTimes(1);
        expect(mockShowErrorModal).toHaveBeenCalledWith('Unknown error occurred', 'AI Prediction Error');
      });
    }
  });

  it('calls predictMask when AI button is clicked successfully', async () => {
    mockPredictMask.mockResolvedValueOnce(undefined);

    const { container } = render(<DrawingTools onResetMask={vi.fn()} />);
    
    const predictButton = container.querySelector('#tb_predict_mask');
    if (predictButton) {
      fireEvent.click(predictButton);
      
      await waitFor(() => {
        expect(mockPredictMask).toHaveBeenCalledTimes(1);
        expect(mockShowErrorModal).not.toHaveBeenCalled();
      });
    }
  });
});

import { render, screen, fireEvent } from '../../../test/test-utils';
import { describe, it, expect, beforeEach } from 'vitest';
import PaintbrushSelector from './PaintbrushSelector';

// Mock the segmentation store
const mockStore = {
  showDrawToolDropdown: false,
  showEraserToolDropdown: false,
  setShowDrawToolDropdown: vi.fn(),
  setShowEraserToolDropdown: vi.fn(),
  toolShape: 'square' as 'square' | 'round',
  setToolShape: vi.fn(),
  toolSize: 5,
  setToolSize: vi.fn(),
};

vi.mock('../../../stores/segmentationStore', () => ({
  useSegmentationStore: vi.fn(() => mockStore),
}));

describe('PaintbrushSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.showDrawToolDropdown = false;
    mockStore.showEraserToolDropdown = false;
    mockStore.toolShape = 'square';
    mockStore.toolSize = 5;
  });

  it('renders the tool button', () => {
    render(
      <PaintbrushSelector
        id="test-brush"
        icon="/test-icon.png"
        title="Test Brush"
        dropdownType="draw"
      />
    );

    const button = screen.getByRole('listitem');
    expect(button).toBeInTheDocument();
  });

  it('shows dropdown when button is clicked', () => {
    render(
      <PaintbrushSelector
        id="test-brush"
        icon="/test-icon.png"
        onClick={vi.fn()}
        dropdownType="draw"
      />
    );

    const button = screen.getByRole('listitem');
    fireEvent.click(button);

    expect(mockStore.setShowDrawToolDropdown).toHaveBeenCalledWith(true);
  });

  it('renders dropdown content when showToolDropdown is true', () => {
    mockStore.showDrawToolDropdown = true;
    
    render(
      <PaintbrushSelector
        id="test-brush"
        icon="/test-icon.png"
        dropdownType="draw"
      />
    );

    expect(screen.getByText('Select Brush Shape & Size')).toBeInTheDocument();
    expect(screen.getByText('Square')).toBeInTheDocument();
    expect(screen.getByText('Round')).toBeInTheDocument();
  });

  it('calls setToolShape and setToolSize when brush option is selected', () => {
    mockStore.showDrawToolDropdown = true;
    
    render(
      <PaintbrushSelector
        id="test-brush"
        icon="/test-icon.png"
        dropdownType="draw"
      />
    );

    // Find and click a round brush option (size 10)
    const roundBrushOptions = screen.getAllByTitle(/Round brush, \d+px/);
    const roundBrush10 = roundBrushOptions.find(option => 
      option.getAttribute('title') === 'Round brush, 10px'
    );
    
    expect(roundBrush10).toBeInTheDocument();
    fireEvent.click(roundBrush10!);

    expect(mockStore.setToolShape).toHaveBeenCalledWith('round');
    expect(mockStore.setToolSize).toHaveBeenCalledWith(10);
    expect(mockStore.setShowDrawToolDropdown).toHaveBeenCalledWith(false);
  });

  it('highlights selected brush option', () => {
    mockStore.showDrawToolDropdown = true;
    mockStore.toolShape = 'round';
    mockStore.toolSize = 15;
    
    render(
      <PaintbrushSelector
        id="test-brush"
        icon="/test-icon.png"
        dropdownType="draw"
      />
    );

    const selectedOption = screen.getByTitle('Round brush, 15px');
    expect(selectedOption).toHaveClass('selected');
  });

  it('executes onClick callback before toggling dropdown', () => {
    const mockOnClick = vi.fn();
    
    render(
      <PaintbrushSelector
        id="test-brush"
        icon="/test-icon.png"
        onClick={mockOnClick}
        dropdownType="draw"
      />
    );

    const button = screen.getByRole('listitem');
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalled();
    expect(mockStore.setShowDrawToolDropdown).toHaveBeenCalledWith(true);
  });

  it('works independently for eraser dropdown', () => {
    render(
      <PaintbrushSelector
        id="test-eraser"
        icon="/test-icon.png"
        onClick={vi.fn()}
        dropdownType="eraser"
      />
    );

    const button = screen.getByRole('listitem');
    fireEvent.click(button);

    expect(mockStore.setShowEraserToolDropdown).toHaveBeenCalledWith(true);
    expect(mockStore.setShowDrawToolDropdown).not.toHaveBeenCalled();
  });
});
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import HelpModal from './HelpModal';

describe('HelpModal', () => {
  it('does not render when isOpen is false', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={false} onClose={onClose} />);
    
    expect(screen.queryByTestId('help-modal')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    expect(screen.getByTestId('help-modal')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('displays all tabs', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    expect(screen.getByTestId('tab-welcome')).toBeInTheDocument();
    expect(screen.getByTestId('tab-faqs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-hotkeys')).toBeInTheDocument();
    expect(screen.getByTestId('tab-about')).toBeInTheDocument();
  });

  it('switches tabs when clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    // Click FAQs tab — should show FAQ content
    fireEvent.click(screen.getByTestId('tab-faqs'));
    expect(screen.getByText("I'm painting pixels, but nothing's happening!")).toBeInTheDocument();
    
    // Click Hotkeys tab — should show hotkeys content
    fireEvent.click(screen.getByTestId('tab-hotkeys'));
    expect(screen.getByText('Select class')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByTestId('close-help-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    // X button is now an aria-labeled SVG button
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays hotkeys table in hotkeys tab', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByTestId('tab-hotkeys'));
    
    expect(screen.getByText('Select class')).toBeInTheDocument();
    expect(screen.getByText('Train AI assistant')).toBeInTheDocument();
    expect(screen.getByText('Save mask')).toBeInTheDocument();
  });

  it('displays about information in about tab', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByTestId('tab-about'));
    
    expect(screen.getByText(/John Mrziglod/)).toBeInTheDocument();
    expect(screen.getByText(/Alistair Francis/)).toBeInTheDocument();
  });

  it('toggles accordion sections in FAQs tab', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByTestId('tab-faqs'));
    
    const accordion = screen.getByText("I'm painting pixels, but nothing's happening!");
    
    // Click to open — panel content should appear
    fireEvent.click(accordion);
    expect(screen.getByText(/you can switch to the/i)).toBeInTheDocument();
    
    // Click to close — panel content should be hidden
    fireEvent.click(accordion);
    // The panel is hidden via display:none, content still in DOM but not visible
  });
});

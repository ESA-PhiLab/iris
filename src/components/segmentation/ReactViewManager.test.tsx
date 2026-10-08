import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/test-utils';
import ReactViewManager from './ReactViewManager';
import { useViewManagerStore } from '../../stores/viewManagerStore';

vi.mock('./ReactViewPort', () => ({
  default: ({ view }: { view: { name: string } }) => <div data-testid="viewport">{view.name}</div>,
}));

const view = (name: string) => ({ name, type: 'image' as const, description: '', data: '$B1' });

describe('ReactViewManager', () => {
  beforeEach(() => {
    useViewManagerStore.setState({
      views: { RGB: view('RGB'), SWIR: view('SWIR') },
      viewGroups: { default: ['RGB', 'SWIR'], radar: ['SWIR'] },
      currentGroup: 'default',
      imageId: 'coast',
    });
  });

  it('shows the views of the current group', () => {
    render(<ReactViewManager />);
    expect(screen.getAllByTestId('viewport').map((v) => v.textContent)).toEqual(['RGB', 'SWIR']);
  });

  it('follows the group', () => {
    useViewManagerStore.setState({ currentGroup: 'radar' });
    render(<ReactViewManager />);
    expect(screen.getAllByTestId('viewport').map((v) => v.textContent)).toEqual(['SWIR']);
  });

  it('waits for the image', () => {
    useViewManagerStore.setState({ imageId: null });
    render(<ReactViewManager />);
    expect(screen.getByText('Loading image...')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { render, screen } from '../../../test/test-utils';
import AIRecommendation from './AIRecommendation';
import { useSegmentationStore } from '../../../stores/segmentationStore';

describe('AIRecommendation', () => {
  it('shows what the AI needs next', () => {
    useSegmentationStore.setState({ aiRecommendation: 'Draw at least 10 pixels from two classes!' });
    render(<AIRecommendation />);
    expect(screen.getByText('Draw at least 10 pixels from two classes!')).toBeInTheDocument();

    act(() => useSegmentationStore.setState({ aiRecommendation: 'Start the training!' }));
    expect(screen.getByText('Start the training!')).toBeInTheDocument();
  });
});

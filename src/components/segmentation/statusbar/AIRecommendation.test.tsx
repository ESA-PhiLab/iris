import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import AIRecommendation from './AIRecommendation';

describe('AIRecommendation', () => {
  it('renders AI recommendation with default text', () => {
    const { container } = render(<AIRecommendation />);
    
    const recommendation = container.querySelector('#ai-recommendation');
    expect(recommendation).toBeInTheDocument();
    expect(screen.getByText('AI is loading')).toBeInTheDocument();
  });
});

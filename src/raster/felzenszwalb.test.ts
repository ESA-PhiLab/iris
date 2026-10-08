import { describe, it, expect } from 'vitest';
import expected from './__fixtures__/expected.json';
import { felzenszwalb } from './felzenszwalb';

// Labels computed with skimage.segmentation.felzenszwalb 0.25
const { width, height, values, labels, rgb, rgbLabels } = expected.felzenszwalb;

describe('felzenszwalb', () => {
  it('segments one channel like skimage', () => {
    const result = felzenszwalb([Float64Array.from(values)], width, height, {
      scale: 1, sigma: 0.5, minSize: 5,
    });
    expect(Array.from(result)).toEqual(labels);
  });

  it('segments several channels like skimage', () => {
    const result = felzenszwalb(rgb.map((channel) => Float64Array.from(channel)), width, height, {
      scale: 20, sigma: 0.8, minSize: 4,
    });
    expect(Array.from(result)).toEqual(rgbLabels);
  });
});

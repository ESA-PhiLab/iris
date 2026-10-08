import { describe, it, expect } from 'vitest';
import expected from './__fixtures__/expected.json';
import { argsortNonNegative, gaussian, nanPercentile, reflect, sobel } from './filters';

// Expected values computed with skimage 0.25, scipy and numpy on the server
const { width, height, values } = expected.image;
const image = Float32Array.from(values);

const expectClose = (actual: ArrayLike<number>, wanted: number[], digits = 5) => {
  expect(actual.length).toBe(wanted.length);
  wanted.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, digits));
};

describe('filters', () => {
  it('reflects at the borders like scipy', () => {
    expect([-2, -1, 0, 2, 3, 4].map((i) => reflect(i, 3))).toEqual([1, 0, 0, 2, 2, 1]);
  });

  it('finds edges like skimage.filters.sobel', () => {
    expectClose(sobel(image, width, height), expected.sobel);
  });

  it('smooths like scipy.ndimage.gaussian_filter', () => {
    expectClose(gaussian(image, width, height, expected.gaussian.sigma), expected.gaussian.values);
  });

  it('computes percentiles like numpy', () => {
    for (const [percent, value] of Object.entries(expected.percentiles)) {
      expect(nanPercentile(image, Number(percent))).toBeCloseTo(value, 5);
    }
    expect(nanPercentile(Float32Array.from([NaN, 1, 3, NaN]), 50)).toBe(2);
  });

  it('sorts numbers by their bits', () => {
    const numbers = Float64Array.from([3.5, 0, 1e-300, 2, NaN, 2, 1e10]);
    expect(Array.from(argsortNonNegative(numbers))).toEqual([1, 2, 3, 5, 0, 6, 4]);
  });
});

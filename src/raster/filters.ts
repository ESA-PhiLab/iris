/**
 * Image filters and statistics of the views and the AI
 *
 * Images are flat arrays of height x width pixels, row by row. The filters
 * give the same results as skimage and scipy.ndimage, which computed them on
 * the server.
 */

type Pixels = Float32Array<ArrayBufferLike> | Float64Array<ArrayBufferLike>;

/** scipy.ndimage 'reflect' mode: (d c b a | a b c d | d c b a) */
export const reflect = (i: number, size: number) => {
  if (size === 1) return 0;
  const period = 2 * size;
  let j = i % period;
  if (j < 0) j += period;
  return j < size ? j : period - j - 1;
};

/**
 * Sobel edge magnitude, as skimage.filters.sobel
 *
 * sqrt((dx² + dy²) / 2) with the derivative [1, 0, -1] along one axis and the
 * smoothing [1, 2, 1] / 4 along the other one.
 */
export const sobel = (image: Pixels, width: number, height: number): Float32Array => {
  const output = new Float32Array(width * height);
  const at = (x: number, y: number) => image[reflect(y, height) * width + reflect(x, width)];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = 0;
      let dy = 0;
      for (let k = -1; k <= 1; k++) {
        const weight = k === 0 ? 0.5 : 0.25;
        dx += weight * (at(x + 1, y + k) - at(x - 1, y + k));
        dy += weight * (at(x + k, y + 1) - at(x + k, y - 1));
      }
      output[y * width + x] = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
    }
  }
  return output;
};

/** Weights of scipy.ndimage.gaussian_filter1d */
const gaussianWeights = (sigma: number, truncate = 4) => {
  const radius = Math.trunc(truncate * sigma + 0.5);
  const weights = new Float64Array(2 * radius + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    weights[i + radius] = Math.exp((-0.5 / (sigma * sigma)) * i * i);
    sum += weights[i + radius];
  }
  for (let i = 0; i < weights.length; i++) weights[i] /= sum;
  return weights;
};

/**
 * Gaussian smoothing, as scipy.ndimage.gaussian_filter with mode 'reflect'
 *
 * Smooths along the rows first, then along the columns, in float64.
 */
export const gaussian = (image: Pixels, width: number, height: number, sigma: number): Float64Array => {
  const input = Float64Array.from(image);
  if (sigma <= 1e-15) return input;
  const weights = gaussianWeights(sigma);
  const radius = (weights.length - 1) / 2;

  const rows = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let k = -radius; k <= radius; k++) {
        value += weights[k + radius] * input[reflect(y + k, height) * width + x];
      }
      rows[y * width + x] = value;
    }
  }

  const output = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let k = -radius; k <= radius; k++) {
        value += weights[k + radius] * rows[row + reflect(x + k, width)];
      }
      output[row + x] = value;
    }
  }
  return output;
};

/** Values that are not NaN, sorted */
const sortedValues = (values: Pixels): Float64Array => {
  const finite = new Float64Array(values.length);
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isNaN(values[i])) finite[count++] = values[i];
  }
  return finite.subarray(0, count).sort();
};

/** Percentile with linear interpolation (numpy's default), ignoring NaN */
export const nanPercentile = (values: Pixels, percent: number, sorted = sortedValues(values)) => {
  if (!sorted.length) return NaN;
  const position = (Math.min(100, Math.max(0, percent)) / 100) * (sorted.length - 1);
  const below = Math.floor(position);
  const above = Math.min(below + 1, sorted.length - 1);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
};

/** Percentiles of the same values, sorting them only once */
export const nanPercentiles = (values: Pixels, percents: number[]) => {
  const sorted = sortedValues(values);
  return percents.map((percent) => nanPercentile(values, percent, sorted));
};

export const nanMin = (values: Pixels) => {
  let min = NaN;
  for (let i = 0; i < values.length; i++) {
    if (values[i] < min || (Number.isNaN(min) && !Number.isNaN(values[i]))) min = values[i];
  }
  return min;
};

export const nanMax = (values: Pixels) => {
  let max = NaN;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > max || (Number.isNaN(max) && !Number.isNaN(values[i]))) max = values[i];
  }
  return max;
};

export const nanMean = (values: Pixels) => {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isNaN(values[i])) {
      sum += values[i];
      count++;
    }
  }
  return count ? sum / count : NaN;
};

export const nanMedian = (values: Pixels) => nanPercentile(values, 50);

/**
 * Order of the values from smallest to largest, NaN last, ties in index order
 *
 * A radix sort on the bits of the numbers, which keep their order as long as
 * the numbers are not negative.
 */
export const argsortNonNegative = (values: Float64Array): Uint32Array => {
  const size = values.length;
  const words = new Uint32Array(values.buffer, values.byteOffset, size * 2);
  let order = new Uint32Array(size);
  let swap = new Uint32Array(size);
  for (let i = 0; i < size; i++) order[i] = i;

  const counts = new Uint32Array(65536);
  // Little endian: word 2i holds the low bits, word 2i + 1 the high bits
  for (const [word, shift] of [[0, 0], [0, 16], [1, 0], [1, 16]]) {
    counts.fill(0);
    for (let i = 0; i < size; i++) counts[(words[2 * i + word] >>> shift) & 0xffff]++;
    let total = 0;
    for (let bucket = 0; bucket < 65536; bucket++) {
      const count = counts[bucket];
      counts[bucket] = total;
      total += count;
    }
    for (let i = 0; i < size; i++) {
      const index = order[i];
      swap[counts[(words[2 * index + word] >>> shift) & 0xffff]++] = index;
    }
    [order, swap] = [swap, order];
  }
  return order;
};

/**
 * Felzenszwalb's graph based segmentation into superpixels
 *
 * A port of skimage.segmentation.felzenszwalb (skimage 0.25), which the
 * server used for the superpixels view and the AI.
 */

import { argsortNonNegative, gaussian } from './filters';

export interface FelzenszwalbOptions {
  /** Higher means larger segments */
  scale?: number;
  /** Width of the Gaussian smoothing before segmenting */
  sigma?: number;
  /** Minimum number of pixels of a segment */
  minSize?: number;
}

const findRoot = (forest: Int32Array, n: number) => {
  let root = n;
  while (forest[root] < root) root = forest[root];
  return root;
};

const setRoot = (forest: Int32Array, n: number, root: number) => {
  while (forest[n] < n) {
    const next = forest[n];
    forest[n] = root;
    n = next;
  }
  forest[n] = root;
};

const joinTrees = (forest: Int32Array, n: number, m: number) => {
  if (n === m) return;
  const root = Math.min(findRoot(forest, n), findRoot(forest, m));
  setRoot(forest, n, root);
  setRoot(forest, m, root);
};

/**
 * Segment an image with one or more channels
 *
 * @returns one label per pixel, from 0 to the number of segments - 1
 */
export const felzenszwalb = (
  channels: Array<Float32Array<ArrayBufferLike> | Float64Array<ArrayBufferLike>>,
  width: number,
  height: number,
  { scale = 1, sigma = 0.8, minSize = 20 }: FelzenszwalbOptions = {}
): Int32Array => {
  const size = width * height;
  const smoothed = channels.map((channel) => gaussian(channel, width, height, sigma));
  const threshold = scale / 255;
  minSize = Math.trunc(minSize);

  // Edges in 8-connectivity, in the order skimage stacks them: right, down,
  // down-right and up-right
  const counts = [
    height * (width - 1),
    (height - 1) * width,
    (height - 1) * (width - 1),
    (height - 1) * (width - 1),
  ].map((count) => Math.max(0, count));
  const edgeCount = counts.reduce((a, b) => a + b, 0);
  const from = new Int32Array(edgeCount);
  const to = new Int32Array(edgeCount);
  const costs = new Float64Array(edgeCount);

  let e = 0;
  const addEdge = (a: number, b: number) => {
    let sum = 0;
    for (const channel of smoothed) {
      const difference = channel[a] - channel[b];
      sum += difference * difference;
    }
    from[e] = a;
    to[e] = b;
    costs[e] = Math.sqrt(sum);
    e++;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) addEdge(y * width + x + 1, y * width + x);
  }
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) addEdge((y + 1) * width + x, y * width + x);
  }
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) addEdge((y + 1) * width + x + 1, y * width + x);
  }
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) addEdge(y * width + x + 1, (y + 1) * width + x);
  }

  const order = argsortNonNegative(costs);
  const forest = new Int32Array(size);
  for (let i = 0; i < size; i++) forest[i] = i;
  const segmentSize = new Int32Array(size).fill(1);
  const innerCost = new Float64Array(size);

  for (let i = 0; i < edgeCount; i++) {
    const edge = order[i];
    const seg0 = findRoot(forest, from[edge]);
    const seg1 = findRoot(forest, to[edge]);
    if (seg0 === seg1) continue;
    // skimage keeps these two in float32
    const inner0 = Math.fround(innerCost[seg0] + threshold / segmentSize[seg0]);
    const inner1 = Math.fround(innerCost[seg1] + threshold / segmentSize[seg1]);
    if (costs[edge] < Math.min(inner0, inner1)) {
      joinTrees(forest, seg0, seg1);
      const merged = findRoot(forest, seg0);
      segmentSize[merged] = segmentSize[seg0] + segmentSize[seg1];
      innerCost[merged] = costs[edge];
    }
  }

  // Merge the segments that are too small
  for (let i = 0; i < edgeCount; i++) {
    const edge = order[i];
    const seg0 = findRoot(forest, from[edge]);
    const seg1 = findRoot(forest, to[edge]);
    if (seg0 === seg1) continue;
    if (segmentSize[seg0] < minSize || segmentSize[seg1] < minSize) {
      joinTrees(forest, seg0, seg1);
      const merged = findRoot(forest, seg0);
      segmentSize[merged] = segmentSize[seg0] + segmentSize[seg1];
    }
  }

  // Number the segments by their root, from the smallest root on
  const labels = new Int32Array(size);
  const numbers = new Int32Array(size).fill(-1);
  for (let i = 0; i < size; i++) {
    const root = findRoot(forest, i);
    numbers[root] = 0;
    labels[i] = root;
  }
  let next = 0;
  for (let i = 0; i < size; i++) {
    if (numbers[i] === 0) numbers[i] = next++;
  }
  for (let i = 0; i < size; i++) labels[i] = numbers[labels[i]];
  return labels;
};

/**
 * Training data and score of the AI
 *
 * The pixels the user drew are split into training pixels, sent to the AI, and
 * test pixels, which tell how well the AI predicts the rest of the mask. The
 * split is the same as in the original IRIS: a seeded shuffle, then per class
 * train_ratio of its pixels (at most max_train_pixels) for training.
 */

/** Linear congruential generator with GCC's constants, as IRIS always used */
export class RNG {
  private state: number;
  private static readonly M = 0x80000000;
  private static readonly A = 1103515245;
  private static readonly C = 12345;

  constructor(seed: number) {
    this.state = seed;
  }

  nextInt() {
    // In floating point, as IRIS always computed it: the product can exceed
    // 2^53 and lose its last bits, which picks the pixels it always picked
    this.state = (RNG.A * this.state + RNG.C) % RNG.M;
    return this.state;
  }

  /** Between 0 and 1, both included */
  random() {
    return this.nextInt() / (RNG.M - 1);
  }

  shuffle<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

/** Classes need more than this many drawn pixels to take part */
export const MIN_CLASS_PIXELS = 10;

export interface TrainingSplit {
  /** Classes with enough drawn pixels */
  classes: number[];
  trainPixels: number[];
  trainLabels: number[];
  testPixels: number[];
  testLabels: number[];
}

/** Same rounding as the original IRIS: half up */
const roundNumber = (x: number) => (x + 0.5) | 0;

export const splitTrainingPixels = (
  mask: Uint8Array,
  userMask: Uint8Array,
  classCount: number,
  { trainRatio, maxTrainPixels }: { trainRatio: number; maxTrainPixels: number }
): TrainingSplit => {
  const counts = new Array(classCount).fill(0);
  for (let i = 0; i < mask.length; i++) {
    if (userMask[i] && mask[i] < classCount) counts[mask[i]]++;
  }
  const classes = counts.flatMap((count, c) => (count > MIN_CLASS_PIXELS ? [c] : []));

  const pixels: number[] = [];
  const labels: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (userMask[i] && counts[mask[i]] > MIN_CLASS_PIXELS) {
      pixels.push(i);
      labels.push(mask[i]);
    }
  }

  const order = pixels.map((_, i) => i);
  new RNG(42).shuffle(order);

  const maxima = counts.map((count) => Math.min(roundNumber(count * trainRatio), maxTrainPixels));
  const taken = new Array(classCount).fill(0);
  const split: TrainingSplit = { classes, trainPixels: [], trainLabels: [], testPixels: [], testLabels: [] };
  for (const i of order) {
    const label = labels[i];
    if (taken[label] < maxima[label]) {
      split.trainPixels.push(pixels[i]);
      split.trainLabels.push(label);
      taken[label]++;
    } else {
      split.testPixels.push(pixels[i]);
      split.testLabels.push(label);
    }
  }
  return split;
};

export interface TestResult {
  /** [actual][predicted] counts of the test pixels */
  matrix: number[][];
  truePositives: Record<number, number>;
  /** 1 where the AI was right, 2 where it was wrong, 0 elsewhere */
  errorsMask: Uint8Array;
}

/** How the predictions compare with the test pixels */
export const testPredictions = (
  split: TrainingSplit,
  predictions: Uint8Array,
  classCount: number
): TestResult => {
  const matrix = Array.from({ length: classCount }, () => new Array(classCount).fill(0));
  const truePositives: Record<number, number> = Object.fromEntries(split.classes.map((c) => [c, 0]));
  const errorsMask = new Uint8Array(predictions.length);
  split.testPixels.forEach((pixel, i) => {
    const actual = split.testLabels[i];
    const predicted = predictions[pixel];
    if (predicted < classCount) matrix[actual][predicted]++;
    if (actual === predicted) {
      truePositives[actual]++;
      errorsMask[pixel] = 1;
    } else {
      errorsMask[pixel] = 2;
    }
  });
  return { matrix, truePositives, errorsMask };
};

import { describe, it, expect } from 'vitest';
import { RNG, splitTrainingPixels, testPredictions } from './training';

describe('RNG', () => {
  it('gives the numbers of the original IRIS', () => {
    // Computed with RNG of iris/static/javascripts/utils.js
    const rng = new RNG(42);
    expect([1, 2, 3, 4, 5].map(() => rng.nextInt()))
      .toEqual([1250496027, 1116302080, 1964818176, 1500480256, 1617229568]);
    const order = Array.from({ length: 12 }, (_, i) => i);
    new RNG(42).shuffle(order);
    expect(order).toEqual([1, 2, 10, 7, 0, 3, 4, 8, 11, 9, 5, 6]);
  });
});

describe('splitTrainingPixels', () => {
  // 20 pixels of class 0, 15 of class 1 and 5 of class 2 (too few)
  const mask = Uint8Array.from([...new Array(20).fill(0), ...new Array(15).fill(1), ...new Array(5).fill(2), 0]);
  const userMask = Uint8Array.from([...new Array(40).fill(1), 0]);

  it('keeps train_ratio of each class for training and the rest for testing', () => {
    const split = splitTrainingPixels(mask, userMask, 3, { trainRatio: 0.8, maxTrainPixels: 100 });
    expect(split.classes).toEqual([0, 1]);
    expect(split.trainLabels.filter((l) => l === 0)).toHaveLength(16);
    expect(split.trainLabels.filter((l) => l === 1)).toHaveLength(12);
    expect(split.testLabels.filter((l) => l === 0)).toHaveLength(4);
    expect(split.testLabels.filter((l) => l === 1)).toHaveLength(3);
    // Neither the undrawn pixel nor class 2
    expect([...split.trainPixels, ...split.testPixels].sort((a, b) => a - b))
      .toEqual(Array.from({ length: 35 }, (_, i) => i));
  });

  it('takes at most max_train_pixels per class', () => {
    const split = splitTrainingPixels(mask, userMask, 3, { trainRatio: 1, maxTrainPixels: 5 });
    expect(split.trainPixels).toHaveLength(10);
    expect(split.testPixels).toHaveLength(25);
  });

  it('accepts a class with exactly the minimum number of pixels', () => {
    const exactMask = Uint8Array.from([...new Array(10).fill(0), ...new Array(10).fill(1)]);
    const exactUserMask = new Uint8Array(20).fill(1);
    const split = splitTrainingPixels(exactMask, exactUserMask, 2, { trainRatio: 0.8, maxTrainPixels: 100 });
    expect(split.classes).toEqual([0, 1]);
  });

  it('scores the predictions on the test pixels', () => {
    const split = { classes: [0, 1], trainPixels: [], trainLabels: [], testPixels: [0, 1, 2], testLabels: [0, 1, 1] };
    const result = testPredictions(split, Uint8Array.from([0, 0, 1, 1]), 2);
    expect(result.matrix).toEqual([[1, 0], [1, 1]]);
    expect(result.truePositives).toEqual({ 0: 1, 1: 1 });
    expect(Array.from(result.errorsMask)).toEqual([1, 2, 1, 0]);
  });
});

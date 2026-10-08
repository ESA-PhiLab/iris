import { describe, it, expect } from 'vitest';
import { predictMask, stratifiedSplit, suppressSpecks } from './segment';
import type { ImagePixels } from '../raster/cog';

describe('stratifiedSplit', () => {
  it('holds out 30% of each class', () => {
    const pixels = Array.from({ length: 100 }, (_, i) => 1000 + i);
    const labels = pixels.map((_, i) => (i < 70 ? 0 : 1));
    const split = stratifiedSplit(pixels, labels, 0.3);
    expect(split.validLabels.filter((l) => l === 0)).toHaveLength(21);
    expect(split.validLabels.filter((l) => l === 1)).toHaveLength(9);
    expect([...split.trainRows, ...split.validRows].sort()).toEqual(pixels);
  });
});

describe('suppressSpecks', () => {
  it('gives isolated pixels the default class', () => {
    const predictions = new Uint8Array(25);
    predictions[12] = 1;
    const result = suppressSpecks(predictions, 5, 5, { threshold: 30, size: 3, defaultClass: 0 });
    expect(result[12]).toBe(0);
  });

  it('keeps pixels with enough neighbours of another class', () => {
    const predictions = new Uint8Array(25).fill(1);
    const result = suppressSpecks(predictions, 5, 5, { threshold: 30, size: 3, defaultClass: 0 });
    expect(Array.from(result)).toEqual(Array.from(predictions));
  });
});

describe('predictMask', () => {
  it('learns the classes of the drawn pixels for the whole mask area', () => {
    // 20 x 20 image, one band: dark left half, bright right half
    const width = 20;
    const band = Float32Array.from({ length: 400 }, (_, i) => ((i % width) < 10 ? 0.1 : 0.9) + ((i * 7) % 10) / 100);
    const pixels: ImagePixels = {
      width, height: 20, files: { image: [band] }, integerRange: { image: null },
      georef: { width, height: 20, crs: 'EPSG:4326', corners: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    };
    // The mask area is the middle 16 x 16; the user drew two columns of each side
    const maskArea: [number, number, number, number] = [2, 2, 18, 18];
    const trainPixels: number[] = [];
    const trainLabels: number[] = [];
    for (let y = 0; y < 16; y++) {
      for (const x of [0, 1, 14, 15]) {
        trainPixels.push(y * 16 + x);
        trainLabels.push(x < 8 ? 0 : 3);
      }
    }
    const prediction = predictMask(pixels, {
      maskArea, trainPixels, trainLabels,
      model: { n_estimators: 20, max_depth: 10, n_leaves: 10, bands: ['$B1'] },
    });
    expect(prediction).toHaveLength(256);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) expect(prediction[y * 16 + x]).toBe(x + 2 < 10 ? 0 : 3);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { binFeatures, findBinEdges, predictGbdt, trainGbdt } from './gbdt';
import { RNG } from '../segmentation/training';

const rows = (n: number) => Uint32Array.from({ length: n }, (_, i) => i);

/** Points in three blobs of a 2D feature space */
const blobs = (perClass: number, seed = 1) => {
  const rng = new RNG(seed);
  const centres = [[0, 0], [4, 1], [1, 5]];
  const x: number[] = [];
  const y: number[] = [];
  const labels: number[] = [];
  centres.forEach(([cx, cy], label) => {
    for (let i = 0; i < perClass; i++) {
      x.push(cx + (rng.random() - 0.5) * 3);
      y.push(cy + (rng.random() - 0.5) * 3);
      labels.push(label);
    }
  });
  return { features: [Float32Array.from(x), Float32Array.from(y)], labels: Uint8Array.from(labels) };
};

describe('binning', () => {
  it('puts each distinct value in its own bin when there are few', () => {
    const values = Float32Array.from([3, 1, 2, 2, 1]);
    expect(Array.from(findBinEdges(values, rows(5), 128))).toEqual([1.5, 2.5, Infinity]);
    const edges = [findBinEdges(values, rows(5), 128)];
    expect(Array.from(binFeatures([values], edges)[0])).toEqual([2, 0, 1, 1, 0]);
  });

  it('uses at most max_bin bins, at quantiles', () => {
    const values = Float32Array.from({ length: 1000 }, (_, i) => i);
    const edges = findBinEdges(values, rows(1000), 10);
    expect(edges.length).toBeLessThanOrEqual(10);
    const bins = binFeatures([values], [edges])[0];
    const counts = new Map<number, number>();
    bins.forEach((bin) => counts.set(bin, (counts.get(bin) ?? 0) + 1));
    for (const count of counts.values()) expect(count).toBeGreaterThan(50);
  });
});

describe('trainGbdt', () => {
  it('separates classes it has seen', () => {
    const { features, labels } = blobs(200);
    const train = rows(600).filter((i) => i % 3 !== 0);
    const valid = rows(600).filter((i) => i % 3 === 0);
    const model = trainGbdt({
      features,
      trainRows: train,
      trainLabels: Uint8Array.from(train, (i) => labels[i]),
      validRows: valid,
      validLabels: Uint8Array.from(valid, (i) => labels[i]),
    }, { numLeaves: 10, maxDepth: 10, nEstimators: 20 });

    const predictions = predictGbdt(model, features);
    const right = predictions.filter((p, i) => p === labels[i]).length;
    expect(right / labels.length).toBeGreaterThan(0.95);
    expect(model.rounds[0]).toHaveLength(3);
  });

  it('keeps the class ids and trains one tree per round for two classes', () => {
    const features = [Float32Array.from({ length: 100 }, (_, i) => i)];
    const labels = Uint8Array.from({ length: 100 }, (_, i) => (i < 50 ? 2 : 7));
    const model = trainGbdt({
      features, trainRows: rows(100), trainLabels: labels, validRows: new Uint32Array(), validLabels: new Uint8Array(),
    }, { numLeaves: 4, maxDepth: 3, nEstimators: 30 });

    expect(model.classes).toEqual([2, 7]);
    expect(model.rounds[0]).toHaveLength(1);
    expect(Array.from(predictGbdt(model, [Float32Array.from([10, 90])]))).toEqual([2, 7]);
  });

  it('stops early when the held out loss stops improving', () => {
    // Noise: nothing to learn beyond the share of each class
    const rng = new RNG(5);
    const features = [Float32Array.from({ length: 400 }, () => rng.random())];
    const labels = Uint8Array.from({ length: 400 }, () => (rng.random() > 0.5 ? 1 : 0));
    const model = trainGbdt({
      features,
      trainRows: rows(300),
      trainLabels: labels.slice(0, 300),
      validRows: Uint32Array.from({ length: 100 }, (_, i) => 300 + i),
      validLabels: labels.slice(300),
    }, { numLeaves: 31, maxDepth: 10, nEstimators: 100 });
    expect(model.rounds.length).toBeLessThan(100);
  });

  it('needs two classes', () => {
    expect(() => trainGbdt({
      features: [new Float32Array(3)], trainRows: rows(3), trainLabels: new Uint8Array(3),
      validRows: new Uint32Array(), validLabels: new Uint8Array(),
    }, { numLeaves: 4, maxDepth: 3, nEstimators: 5 })).toThrow(/two classes/);
  });
});

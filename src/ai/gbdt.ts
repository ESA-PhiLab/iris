/**
 * Gradient boosted trees for the AI, trained in the browser
 *
 * The same kind of model as LightGBM's LGBMClassifier with the settings IRIS
 * used on the server: features binned into at most max_bin histogram bins,
 * trees grown leaf by leaf up to num_leaves and max_depth, at least 20 pixels
 * per leaf, learning rate 0.05, log loss (one tree per class and round for
 * more than two classes), and early stopping on held out pixels.
 */

export interface GbdtOptions {
  numLeaves: number;
  maxDepth: number;
  nEstimators: number;
  learningRate?: number;
  maxBin?: number;
  minDataInLeaf?: number;
  minSumHessianInLeaf?: number;
  /** Stop when the held out loss has not improved for this many rounds */
  earlyStoppingRounds?: number;
}

/** Bin edges of each feature: a value goes to the first bin whose edge is not below it */
export type BinEdges = Float64Array[];

interface Tree {
  /** Per node: feature and bin of the split, children; a negative child is ~leaf */
  feature: number[];
  bin: number[];
  left: number[];
  right: number[];
  leafValues: number[];
}

export interface GbdtModel {
  classes: number[];
  edges: BinEdges;
  initScores: number[];
  /** Trees of each round, one per class (one in total for two classes) */
  rounds: Tree[][];
}

const EPSILON = 1e-15;

/**
 * Edges of at most maxBin bins per feature, from the training values:
 * between distinct values when there are few, else at quantiles.
 */
export const findBinEdges = (values: Float32Array, rows: Uint32Array, maxBin: number): Float64Array => {
  const sorted = new Float64Array(rows.length);
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    const value = values[rows[i]];
    if (!Number.isNaN(value)) sorted[n++] = value;
  }
  const data = sorted.subarray(0, n).sort();

  const distinct: number[] = [];
  const counts: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0 || data[i] !== data[i - 1]) {
      distinct.push(data[i]);
      counts.push(1);
    } else {
      counts[counts.length - 1]++;
    }
  }

  const edges: number[] = [];
  if (distinct.length <= maxBin) {
    for (let i = 0; i < distinct.length - 1; i++) edges.push((distinct[i] + distinct[i + 1]) / 2);
  } else {
    const perBin = data.length / maxBin;
    let filled = 0;
    for (let i = 0; i < distinct.length - 1 && edges.length < maxBin - 1; i++) {
      filled += counts[i];
      if (filled >= perBin * (edges.length + 1)) edges.push((distinct[i] + distinct[i + 1]) / 2);
    }
  }
  edges.push(Infinity);
  return Float64Array.from(edges);
};

/** Bin of a value; values without a number go to the first bin */
const binOf = (edges: Float64Array, value: number) => {
  if (Number.isNaN(value)) return 0;
  let low = 0;
  let high = edges.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (value <= edges[middle]) high = middle;
    else low = middle + 1;
  }
  return low;
};

/** Bins of the given rows of every feature, one byte per value */
export const binFeatures = (features: Float32Array[], edges: BinEdges, rows?: Uint32Array) =>
  features.map((values, f) => {
    const count = rows ? rows.length : values.length;
    const bins = new Uint8Array(count);
    for (let i = 0; i < count; i++) bins[i] = binOf(edges[f], values[rows ? rows[i] : i]);
    return bins;
  });

interface Leaf {
  rows: Uint32Array;
  depth: number;
  gradient: number;
  hessian: number;
  split: { gain: number; feature: number; bin: number } | null;
  /** Node of the tree that points to this leaf, and on which side */
  parent: number;
  side: 'left' | 'right' | null;
}

/** One tree on the gradients and hessians of one class */
const growTree = (
  bins: Uint8Array[],
  binCounts: number[],
  gradients: Float64Array,
  hessians: Float64Array,
  rows: Uint32Array,
  options: Required<GbdtOptions>
): Tree => {
  const { numLeaves, maxDepth, minDataInLeaf, minSumHessianInLeaf, learningRate } = options;
  const tree: Tree = { feature: [], bin: [], left: [], right: [], leafValues: [] };

  const sums = (leafRows: Uint32Array) => {
    let gradient = 0;
    let hessian = 0;
    for (let i = 0; i < leafRows.length; i++) {
      gradient += gradients[leafRows[i]];
      hessian += hessians[leafRows[i]];
    }
    return { gradient, hessian };
  };

  const bestSplit = (leaf: Leaf): Leaf['split'] => {
    if (leaf.rows.length < 2 * minDataInLeaf || (maxDepth > 0 && leaf.depth >= maxDepth)) return null;
    const parentScore = (leaf.gradient * leaf.gradient) / Math.max(leaf.hessian, EPSILON);
    let best: Leaf['split'] = null;
    for (let f = 0; f < bins.length; f++) {
      const size = binCounts[f];
      if (size < 2) continue;
      const g = new Float64Array(size);
      const h = new Float64Array(size);
      const n = new Uint32Array(size);
      const featureBins = bins[f];
      for (let i = 0; i < leaf.rows.length; i++) {
        const row = leaf.rows[i];
        const bin = featureBins[row];
        g[bin] += gradients[row];
        h[bin] += hessians[row];
        n[bin]++;
      }
      let gl = 0;
      let hl = 0;
      let nl = 0;
      for (let bin = 0; bin < size - 1; bin++) {
        gl += g[bin];
        hl += h[bin];
        nl += n[bin];
        const nr = leaf.rows.length - nl;
        if (nl < minDataInLeaf || hl < minSumHessianInLeaf) continue;
        if (nr < minDataInLeaf) break;
        const gr = leaf.gradient - gl;
        const hr = leaf.hessian - hl;
        if (hr < minSumHessianInLeaf) continue;
        const gain = (gl * gl) / hl + (gr * gr) / hr - parentScore;
        if (gain > (best?.gain ?? 0)) best = { gain, feature: f, bin };
      }
    }
    return best;
  };

  const makeLeaf = (leafRows: Uint32Array, depth: number, parent: number, side: Leaf['side']): Leaf => {
    const { gradient, hessian } = sums(leafRows);
    const leaf: Leaf = { rows: leafRows, depth, gradient, hessian, split: null, parent, side };
    leaf.split = bestSplit(leaf);
    return leaf;
  };

  const leaves: Leaf[] = [makeLeaf(rows, 0, -1, null)];
  while (leaves.length < numLeaves) {
    let pick = -1;
    for (let i = 0; i < leaves.length; i++) {
      const split = leaves[i].split;
      if (split && (pick < 0 || split.gain > leaves[pick].split!.gain)) pick = i;
    }
    if (pick < 0) break;

    const leaf = leaves[pick];
    const { feature, bin } = leaf.split!;
    const featureBins = bins[feature];
    let leftCount = 0;
    for (let i = 0; i < leaf.rows.length; i++) if (featureBins[leaf.rows[i]] <= bin) leftCount++;
    const leftRows = new Uint32Array(leftCount);
    const rightRows = new Uint32Array(leaf.rows.length - leftCount);
    let l = 0;
    let r = 0;
    for (let i = 0; i < leaf.rows.length; i++) {
      const row = leaf.rows[i];
      if (featureBins[row] <= bin) leftRows[l++] = row;
      else rightRows[r++] = row;
    }

    const node = tree.feature.length;
    tree.feature.push(feature);
    tree.bin.push(bin);
    tree.left.push(0);
    tree.right.push(0);
    if (leaf.parent >= 0) tree[leaf.side!][leaf.parent] = node;

    leaves.splice(pick, 1,
      makeLeaf(leftRows, leaf.depth + 1, node, 'left'),
      makeLeaf(rightRows, leaf.depth + 1, node, 'right'));
  }

  leaves.forEach((leaf, i) => {
    tree.leafValues.push(leaf.hessian > 0 ? (-leaf.gradient / leaf.hessian) * learningRate : 0);
    if (leaf.parent >= 0) tree[leaf.side!][leaf.parent] = ~i;
  });
  return tree;
};

/** Value of a tree for one row of binned features */
const treeValue = (tree: Tree, bins: Uint8Array[], row: number) => {
  if (!tree.feature.length) return tree.leafValues[0];
  let node = 0;
  for (;;) {
    const next = bins[tree.feature[node]][row] <= tree.bin[node] ? tree.left[node] : tree.right[node];
    if (next < 0) return tree.leafValues[~next];
    node = next;
  }
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Class probabilities from raw scores (K scores, or one for two classes) */
const probabilities = (scores: number[], two: boolean) => {
  if (two) {
    const p = sigmoid(scores[0]);
    return [1 - p, p];
  }
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
};

export interface TrainingData {
  /** One array per feature, one value per pixel of the mask area */
  features: Float32Array[];
  /** Pixels to train on and their classes */
  trainRows: Uint32Array;
  trainLabels: Uint8Array;
  /** Pixels held out for early stopping and their classes */
  validRows: Uint32Array;
  validLabels: Uint8Array;
}

export const trainGbdt = (data: TrainingData, options: GbdtOptions): GbdtModel => {
  const settings: Required<GbdtOptions> = {
    learningRate: 0.05,
    maxBin: 128,
    minDataInLeaf: 20,
    minSumHessianInLeaf: 1e-3,
    earlyStoppingRounds: 4,
    ...options,
  };
  const classes = [...new Set(data.trainLabels)].sort((a, b) => a - b);
  if (classes.length < 2) throw new Error('The AI needs pixels of at least two classes');
  const two = classes.length === 2;
  const outputs = two ? 1 : classes.length;
  const target = (label: number) => classes.indexOf(label);

  const edges = data.features.map((values) => findBinEdges(values, data.trainRows, settings.maxBin));
  const binCounts = edges.map((e) => e.length);
  const trainBins = binFeatures(data.features, edges, data.trainRows);
  const validBins = binFeatures(data.features, edges, data.validRows);
  const n = data.trainRows.length;
  const targets = Uint8Array.from(data.trainLabels, target);
  const validTargets = Uint8Array.from(data.validLabels, target);

  // Start from the share of each class
  const shares = classes.map((_, k) => targets.filter((t) => t === k).length / n);
  const initScores = two
    ? [Math.log(Math.max(shares[1], EPSILON) / Math.max(shares[0], EPSILON))]
    : shares.map((share) => Math.log(Math.max(share, EPSILON)));

  const scores = Array.from({ length: outputs }, (_, k) => new Float64Array(n).fill(initScores[k]));
  const validScores = Array.from({ length: outputs }, (_, k) =>
    new Float64Array(data.validRows.length).fill(initScores[k]));
  const rows = Uint32Array.from({ length: n }, (_, i) => i);
  const gradients = new Float64Array(n);
  const hessians = new Float64Array(n);
  // LightGBM scales the hessians of the softmax by K / (K - 1)
  const factor = two ? 1 : classes.length / (classes.length - 1);

  const rounds: Tree[][] = [];
  let bestLoss = Infinity;
  let bestRounds = 0;
  for (let round = 0; round < settings.nEstimators; round++) {
    const trees: Tree[] = [];
    const probs = Array.from({ length: n }, (_, i) =>
      probabilities(scores.map((s) => s[i]), two));
    for (let k = 0; k < outputs; k++) {
      const positive = two ? 1 : k;
      for (let i = 0; i < n; i++) {
        const p = probs[i][positive];
        gradients[i] = p - (targets[i] === positive ? 1 : 0);
        hessians[i] = Math.max(factor * p * (1 - p), EPSILON);
      }
      const tree = growTree(trainBins, binCounts, gradients, hessians, rows, settings);
      for (let i = 0; i < n; i++) scores[k][i] += treeValue(tree, trainBins, i);
      for (let i = 0; i < data.validRows.length; i++) validScores[k][i] += treeValue(tree, validBins, i);
      trees.push(tree);
    }
    rounds.push(trees);

    if (!data.validRows.length) {
      bestRounds = rounds.length;
      continue;
    }
    let loss = 0;
    for (let i = 0; i < data.validRows.length; i++) {
      const p = probabilities(validScores.map((s) => s[i]), two)[validTargets[i]];
      loss -= Math.log(Math.max(p, EPSILON));
    }
    loss /= data.validRows.length;
    if (loss < bestLoss) {
      bestLoss = loss;
      bestRounds = rounds.length;
    } else if (rounds.length - bestRounds >= settings.earlyStoppingRounds) {
      break;
    }
  }

  return { classes, edges, initScores, rounds: rounds.slice(0, Math.max(1, bestRounds)) };
};

/** Class of every pixel */
export const predictGbdt = (model: GbdtModel, features: Float32Array[]): Uint8Array => {
  const bins = binFeatures(features, model.edges);
  const size = bins[0]?.length ?? 0;
  const two = model.classes.length === 2;
  const outputs = model.initScores.length;
  const predictions = new Uint8Array(size);
  const scores = new Float64Array(outputs);
  for (let i = 0; i < size; i++) {
    for (let k = 0; k < outputs; k++) scores[k] = model.initScores[k];
    for (const trees of model.rounds) {
      for (let k = 0; k < outputs; k++) scores[k] += treeValue(trees[k], bins, i);
    }
    let best = 0;
    if (two) {
      best = scores[0] > 0 ? 1 : 0;
    } else {
      for (let k = 1; k < outputs; k++) if (scores[k] > scores[best]) best = k;
    }
    predictions[i] = model.classes[best];
  }
  return predictions;
};

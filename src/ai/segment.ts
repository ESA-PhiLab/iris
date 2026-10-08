/**
 * Predict the class of every pixel of the mask area from the pixels the user
 * drew, in the browser
 *
 * The training pixels are split again, 30% of each class held out to stop
 * training when the model stops improving. After predicting, small specks of
 * other classes can be suppressed (the suppression settings).
 */

import type { ImagePixels } from '../raster/cog';
import { RNG } from '../segmentation/training';
import { FeatureOptions, pixelFeatures } from './features';
import { predictGbdt, trainGbdt } from './gbdt';

export interface AiModelSettings extends FeatureOptions {
  n_estimators: number;
  max_depth: number;
  n_leaves: number;
  suppression_threshold?: number;
  suppression_filter_size?: number;
  suppression_default_class?: number;
}

export interface PredictionRequest {
  maskArea: [number, number, number, number];
  /** Pixels of the mask area to learn from, and their classes */
  trainPixels: number[];
  trainLabels: number[];
  model: AiModelSettings;
}

/** Hold out a share of the pixels of each class */
export const stratifiedSplit = (pixels: number[], labels: number[], heldOut: number, seed = 42) => {
  const byClass = new Map<number, number[]>();
  labels.forEach((label, i) => {
    if (!byClass.has(label)) byClass.set(label, []);
    byClass.get(label)!.push(i);
  });

  const rng = new RNG(seed);
  const train: number[] = [];
  const valid: number[] = [];
  for (const label of [...byClass.keys()].sort((a, b) => a - b)) {
    const members = byClass.get(label)!;
    rng.shuffle(members);
    const held = members.length > 1 ? Math.max(1, Math.round(members.length * heldOut)) : 0;
    members.forEach((member, i) => (i < held ? valid : train).push(member));
  }
  return {
    trainRows: Uint32Array.from(train, (i) => pixels[i]),
    trainLabels: Uint8Array.from(train, (i) => labels[i]),
    validRows: Uint32Array.from(valid, (i) => pixels[i]),
    validLabels: Uint8Array.from(valid, (i) => labels[i]),
  };
};

/**
 * Give pixels the default class where few of their neighbours have another
 * class: threshold is the percentage of neighbours below which it happens.
 * Outside the mask area counts as half.
 */
export const suppressSpecks = (
  predictions: Uint8Array,
  width: number,
  height: number,
  { threshold, size, defaultClass }: { threshold: number; size: number; defaultClass: number }
) => {
  const other = Uint8Array.from(predictions, (value) => (value !== defaultClass ? 1 : 0));
  const radius = Math.floor(size / 2);
  const neighbours = size * size - 1;
  const result = new Uint8Array(predictions);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let dy = -radius; dy < size - radius; dy++) {
        for (let dx = -radius; dx < size - radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          sum += nx < 0 || ny < 0 || nx >= width || ny >= height ? 0.5 : other[ny * width + nx];
        }
      }
      if ((100 * sum) / neighbours < threshold) result[y * width + x] = defaultClass;
    }
  }
  return result;
};

export const predictMask = (pixels: ImagePixels, request: PredictionRequest): Uint8Array => {
  const { maskArea, model } = request;
  const width = maskArea[2] - maskArea[0];
  const height = maskArea[3] - maskArea[1];

  const features = pixelFeatures(pixels, maskArea, model);
  const split = stratifiedSplit(request.trainPixels, request.trainLabels, 0.3);
  const gbdt = trainGbdt({ features, ...split }, {
    numLeaves: model.n_leaves,
    maxDepth: model.max_depth,
    nEstimators: model.n_estimators,
  });
  const predictions = predictGbdt(gbdt, features);

  if (model.suppression_threshold) {
    return suppressSpecks(predictions, width, height, {
      threshold: model.suppression_threshold,
      size: model.suppression_filter_size ?? 5,
      defaultClass: model.suppression_default_class ?? 0,
    });
  }
  return predictions;
};

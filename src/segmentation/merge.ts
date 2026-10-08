/**
 * Merge the masks of several users and score each of them
 *
 * As the IRIS server did: every pixel gets the class most users gave it, and
 * each user is scored against the merged mask (against the other user when
 * there are two). Scores are percentages, f1 (macro), jaccard or accuracy.
 */

import type { ClassConfig } from '../types/iris';

export type ScoreKind = 'f1' | 'jaccard' | 'accuracy';

/** Class most users gave each pixel; ties go to the smallest class */
export const mergeMasks = (masks: Uint8Array[]): Uint8Array => {
  if (!masks.length) throw new Error('No masks to merge');
  const size = masks[0].length;
  const merged = new Uint8Array(size);
  const votes = new Uint16Array(256);
  for (let i = 0; i < size; i++) {
    let best = -1;
    for (const mask of masks) votes[mask[i]]++;
    for (const mask of masks) {
      const klass = mask[i];
      if (best < 0 || votes[klass] > votes[best] || (votes[klass] === votes[best] && klass < best)) best = klass;
    }
    merged[i] = best;
    for (const mask of masks) votes[mask[i]] = 0;
  }
  return merged;
};

/** Python's round(): halves go to the even number */
export const roundHalfEven = (x: number) => {
  const floor = Math.floor(x);
  const fraction = x - floor;
  if (Math.abs(fraction - 0.5) > 1e-9) return Math.round(x);
  return floor % 2 === 0 ? floor : floor + 1;
};

/** Agreement of a mask with a reference mask, in percent */
export const maskScore = (reference: Uint8Array, mask: Uint8Array, kind: ScoreKind): number => {
  if (kind === 'accuracy') {
    let same = 0;
    for (let i = 0; i < reference.length; i++) if (reference[i] === mask[i]) same++;
    return roundHalfEven((100 * same) / reference.length);
  }

  // Per class: true positives, and how often it is the reference and the mask
  const tp = new Float64Array(256);
  const inReference = new Float64Array(256);
  const inMask = new Float64Array(256);
  for (let i = 0; i < reference.length; i++) {
    inReference[reference[i]]++;
    inMask[mask[i]]++;
    if (reference[i] === mask[i]) tp[reference[i]]++;
  }
  const classes = [...Array(256).keys()].filter((c) => inReference[c] || inMask[c]);
  const binary = classes.every((c) => c === 0 || c === 1);

  const classScore = (c: number) => {
    if (kind === 'jaccard') {
      const union = inReference[c] + inMask[c] - tp[c];
      return union ? tp[c] / union : 0;
    }
    const denominator = inReference[c] + inMask[c];
    return denominator ? (2 * tp[c]) / denominator : 0;
  };
  // sklearn's jaccard_score scores the positive class of binary masks
  const value = kind === 'jaccard' && binary
    ? classScore(1)
    : classes.reduce((sum, c) => sum + classScore(c), 0) / classes.length;
  return roundHalfEven(100 * value);
};

/**
 * Score of each user: against the other user when there are two, else
 * against the merged mask
 */
export const userScores = (masks: Uint8Array[], merged: Uint8Array, kind: ScoreKind): number[] =>
  masks.map((mask, u) => maskScore(masks.length === 2 ? masks[1 - u] : merged, mask, kind));

export type MaskEncoding = 'integer' | 'binary' | 'rgb' | 'rgba';

/** Bands of the merged mask file: class ids, one band per class, or colours */
export const encodeMask = (mask: Uint8Array, encoding: MaskEncoding, classes: ClassConfig[]): Uint8Array[] => {
  if (encoding === 'integer') return [mask];
  if (encoding === 'binary') {
    return classes.map((_, c) => Uint8Array.from(mask, (value) => (value === c ? 1 : 0)));
  }
  const channels = encoding === 'rgb' ? 3 : 4;
  return Array.from({ length: channels }, (_, channel) =>
    Uint8Array.from(mask, (value) => classes[value]?.colour[channel] ?? 0));
};

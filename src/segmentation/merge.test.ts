import { describe, it, expect } from 'vitest';
import { encodeMask, maskScore, mergeMasks, roundHalfEven, userScores } from './merge';

// Computed with the server's compute_merged_mask and sklearn
const a = [2, 0, 1, 3, 0, 0, 0, 1, 1, 3, 2, 3, 1, 1, 2, 1, 3, 2, 0, 0, 0, 1, 3, 2, 0, 2, 1, 2, 2, 2, 2, 3, 0, 1, 3, 2, 1, 0, 2, 1, 1, 2, 0, 3, 2, 3, 0, 3, 1, 3];
const b = [3, 0, 1, 0, 2, 1, 1, 3, 2, 0, 0, 3, 2, 0, 0, 1, 2, 0, 3, 1, 0, 0, 3, 1, 1, 2, 1, 1, 1, 1, 1, 3, 2, 3, 0, 0, 3, 3, 0, 3, 0, 0, 0, 2, 2, 3, 3, 0, 3, 1];
const c = [1, 2, 0, 1, 1, 0, 1, 0, 2, 2, 0, 0, 2, 0, 0, 0, 3, 2, 2, 0, 0, 3, 1, 1, 1, 0, 0, 3, 1, 0, 0, 1, 1, 3, 3, 0, 0, 3, 3, 0, 2, 0, 0, 0, 0, 0, 0, 3, 3, 0];
const merged = [1, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 3, 2, 0, 0, 1, 3, 2, 0, 0, 0, 0, 3, 1, 1, 2, 1, 1, 1, 0, 0, 3, 0, 3, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 2, 3, 0, 3, 3, 0];

describe('merging masks', () => {
  it('gives each pixel the class most users gave it, the smallest on ties', () => {
    expect(Array.from(mergeMasks([a, b, c].map((m) => Uint8Array.from(m))))).toEqual(merged);
  });

  it('scores like sklearn', () => {
    const reference = Uint8Array.from(merged);
    const mask = Uint8Array.from(a);
    expect(maskScore(reference, mask, 'f1')).toBe(43);
    expect(maskScore(reference, mask, 'accuracy')).toBe(44);
    expect(maskScore(reference, mask, 'jaccard')).toBe(29);
    // Binary masks: the jaccard of the positive class
    expect(maskScore(Uint8Array.from([0, 1, 1, 0, 1, 1]), Uint8Array.from([0, 1, 0, 0, 1, 0]), 'jaccard')).toBe(50);
    expect(maskScore(Uint8Array.from([0, 1, 1, 0]), Uint8Array.from([0, 1, 0, 0]), 'f1')).toBe(73);
  });

  it('scores two users against each other', () => {
    const masks = [Uint8Array.from([0, 1, 1, 0]), Uint8Array.from([0, 1, 0, 0])];
    expect(userScores(masks, mergeMasks(masks), 'accuracy')).toEqual([75, 75]);
  });

  it('rounds halves to even like Python', () => {
    expect([0.5, 1.5, 72.5, 73.5, 2.4, 2.6].map(roundHalfEven)).toEqual([0, 2, 72, 74, 2, 3]);
  });

  it('encodes the merged mask', () => {
    const classes = [{ name: 'A', colour: [1, 2, 3, 4] }, { name: 'B', colour: [5, 6, 7, 8] }] as any;
    const mask = Uint8Array.from([0, 1]);
    expect(encodeMask(mask, 'integer', classes).map((band) => Array.from(band))).toEqual([[0, 1]]);
    expect(encodeMask(mask, 'binary', classes).map((band) => Array.from(band))).toEqual([[1, 0], [0, 1]]);
    expect(encodeMask(mask, 'rgb', classes).map((band) => Array.from(band))).toEqual([[1, 5], [2, 6], [3, 7]]);
    expect(encodeMask(mask, 'rgba', classes)).toHaveLength(4);
  });
});

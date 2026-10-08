import { describe, it, expect } from 'vitest';
import { brushImageRect, brushMaskRect, fillRect, strokePositions, unionRect } from './brush';

describe('brush', () => {
  it('covers size x size pixels around the cursor', () => {
    expect(brushImageRect([10.7, 3.2], 1)).toEqual([10, 3, 11, 4]);
    expect(brushImageRect([10.7, 3.2], 2)).toEqual([10, 2, 12, 4]);
    expect(brushImageRect([10.5, 10.5], 5)).toEqual([8, 8, 13, 13]);
    expect(brushImageRect([10, 10], 4)).toEqual([8, 8, 12, 12]);
  });

  it('paints the mask only inside the mask area', () => {
    const area: [number, number, number, number] = [64, 64, 448, 448];
    expect(brushMaskRect([100.5, 70.5], 5, area)).toEqual([34, 4, 39, 9]);
    // Half outside on the left and at the bottom
    expect(brushMaskRect([64, 447.5], 4, area)).toEqual([0, 382, 2, 384]);
    // The last row and column can be painted too
    expect(brushMaskRect([447.5, 447.5], 1, area)).toEqual([383, 383, 384, 384]);
    expect(brushMaskRect([10, 10], 5, area)).toBeNull();
  });

  it('fills the gaps of fast strokes', () => {
    expect(strokePositions([0, 0], [0.5, 0])).toEqual([[0.5, 0]]);
    expect(strokePositions([0, 0], [4, 2])).toEqual([[1, 0.5], [2, 1], [3, 1.5], [4, 2]]);
  });

  it('joins rects and fills them', () => {
    expect(unionRect(null, [1, 1, 2, 2])).toEqual([1, 1, 2, 2]);
    expect(unionRect([0, 2, 3, 3], [1, 1, 2, 5])).toEqual([0, 1, 3, 5]);

    const mask = new Uint8Array(12);
    const userMask = new Uint8Array(12);
    fillRect(mask, userMask, 4, [1, 1, 3, 3], 2, 1);
    expect(Array.from(mask)).toEqual([0, 0, 0, 0, 0, 2, 2, 0, 0, 2, 2, 0]);
    expect(Array.from(userMask)).toEqual([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0]);
  });
});

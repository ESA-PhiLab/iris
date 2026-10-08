import { describe, it, expect } from 'vitest';
import { maskPixels } from './maskColours';
import type { ClassConfig } from '../types/iris';

const classes: ClassConfig[] = [
  { name: 'Clear', colour: [0, 150, 255, 70] },
  { name: 'Cloud', colour: [255, 255, 0, 70], user_colour: [255, 255, 0, 255] },
];
const layers = {
  mask: Uint8Array.from([0, 1, 1, 5]),
  userMask: Uint8Array.from([1, 0, 1, 0]),
  errorsMask: Uint8Array.from([0, 1, 2, 0]),
};
const pixels = (type: 'final' | 'user' | 'errors') =>
  Array.from(maskPixels(layers, type, classes, 2, [0, 0, 2, 2]));

describe('maskPixels', () => {
  it('colours every pixel by its class in the final mask', () => {
    expect(pixels('final')).toEqual([
      0, 150, 255, 70, 255, 255, 0, 70, 255, 255, 0, 70, 0, 0, 0, 0,
    ]);
  });

  it('shows only the drawn pixels in the user mask', () => {
    expect(pixels('user')).toEqual([
      0, 150, 255, 70, 255, 255, 255, 0, 255, 255, 0, 255, 255, 255, 255, 0,
    ]);
  });

  it('shows where the AI was right and wrong', () => {
    expect(pixels('errors')).toEqual([
      255, 255, 255, 0, 0, 255, 0, 70, 255, 70, 70, 255, 255, 255, 255, 0,
    ]);
  });

  it('colours a part of the mask', () => {
    expect(Array.from(maskPixels(layers, 'final', classes, 2, [1, 1, 2, 2]))).toEqual([0, 0, 0, 0]);
  });
});

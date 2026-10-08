/**
 * Colours of the mask on the map
 *
 * - final: every pixel in the colour of its class
 * - user: only the pixels the user drew, in the user colour of their class
 * - errors: the test pixels of the AI, green where it was right and red where
 *   it was wrong
 */

import type { ClassConfig } from '../types/iris';
import type { Rect } from './brush';

export type MaskType = 'final' | 'user' | 'errors';

const TRANSPARENT = [255, 255, 255, 0];
const ERROR_COLOURS = [TRANSPARENT, [0, 255, 0, 70], [255, 70, 70, 255]];

export interface MaskLayers {
  mask: Uint8Array;
  userMask: Uint8Array;
  errorsMask: Uint8Array | null;
}

/** RGBA colours of each value of the mask, 4 bytes per value */
const palette = (type: MaskType, classes: ClassConfig[]): Uint8Array => {
  const colours = type === 'errors'
    ? ERROR_COLOURS
    : type === 'user'
      ? [TRANSPARENT, ...classes.map((c) => c.user_colour ?? c.colour)]
      : classes.map((c) => c.colour);
  // Values without a class stay transparent
  const bytes = new Uint8Array(256 * 4);
  colours.forEach((colour, value) => bytes.set(colour.slice(0, 4), 4 * value));
  return bytes;
};

/** Colour the pixels of a rect of the mask, as RGBA bytes row by row */
export const maskPixels = (
  layers: MaskLayers,
  type: MaskType,
  classes: ClassConfig[],
  width: number,
  [x0, y0, x1, y1]: Rect
): Uint8ClampedArray<ArrayBuffer> => {
  const colours = palette(type, classes);
  const pixels = new Uint8ClampedArray((x1 - x0) * (y1 - y0) * 4);
  const { mask, userMask, errorsMask } = layers;
  let out = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * width + x;
      const value = type === 'final'
        ? mask[i]
        : type === 'user'
          ? (userMask[i] ? mask[i] + 1 : 0)
          : (errorsMask ? errorsMask[i] : 0);
      pixels.set(colours.subarray(4 * value, 4 * value + 4), out);
      out += 4;
    }
  }
  return pixels;
};

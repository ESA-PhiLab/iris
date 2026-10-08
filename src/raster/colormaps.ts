/**
 * Matplotlib colormaps for single band views
 *
 * A view with one band is coloured like matplotlib did on the server:
 * cmap(values) with values between 0 and 1, then int(255 * colour).
 */

import { COLORMAP_ALIASES, COLORMAP_TABLES } from './colormapData';

const decoded = new Map<string, Uint8Array>();

const decode = (base64: string) => {
  const text = atob(base64);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
};

/** Names of the colormaps one can use, without the reversed `_r` ones */
export const colormapNames = () =>
  [...Object.keys(COLORMAP_TABLES), ...Object.keys(COLORMAP_ALIASES)].sort();

/**
 * Colours of a colormap, 3 bytes (RGB) per colour
 *
 * Names ending in `_r` give the reversed colormap, as in matplotlib.
 */
export const colormapTable = (name: string): Uint8Array => {
  const cached = decoded.get(name);
  if (cached) return cached;

  const reversed = name.endsWith('_r');
  const base = reversed ? name.slice(0, -2) : name;
  const data = COLORMAP_TABLES[COLORMAP_ALIASES[base] ?? base];
  if (!data) {
    throw new Error(`Unknown colormap '${name}'`);
  }

  let table = decode(data);
  if (reversed) {
    const colours = table.length / 3;
    const flipped = new Uint8Array(table.length);
    for (let i = 0; i < colours; i++) {
      flipped.set(table.subarray(3 * (colours - 1 - i), 3 * (colours - i)), 3 * i);
    }
    table = flipped;
  }
  decoded.set(name, table);
  return table;
};

/** Index of the colour for a value between 0 and 1, as matplotlib picks it */
export const colourIndex = (value: number, colours: number) => {
  const index = Math.floor(value * colours);
  return index < 0 ? 0 : index >= colours ? colours - 1 : index;
};

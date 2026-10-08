/**
 * Render a view of an image in the browser
 *
 * Each expression of the view is computed for every pixel, stretched between
 * 0 and 1 and turned into bytes: one expression is coloured with a colormap,
 * three give red, green and blue. This is what Project.render_image did on the
 * server.
 */

import { colourIndex, colormapTable } from './colormaps';
import { Raster, Value, evaluate, parseExpression } from './expression';
import { nanMax, nanMin, nanPercentiles } from './filters';

export interface ViewSpec {
  name?: string;
  /** One expression (single band) or three (red, green, blue) */
  data: string | string[];
  /** Colormap of single band views */
  cmap?: string;
  /** Percentile of pixels saturated at both ends */
  clip?: number | null;
  vmin?: number | null;
  vmax?: number | null;
}

export interface RenderedImage {
  width: number;
  height: number;
  /** RGBA bytes, row by row */
  data: Uint8ClampedArray;
}

const given = (value: number | null | undefined): value is number =>
  value !== undefined && value !== null;

/** Lower and upper value of the stretch of one expression */
export const stretchRange = (values: Float32Array, view: ViewSpec): [number, number] => {
  if (given(view.clip)) {
    if (given(view.vmin) || given(view.vmax)) {
      throw new Error("Cannot specify both 'clip' and 'vmin'/'vmax' in view");
    }
    const [lower, upper] = nanPercentiles(values, [view.clip, 100 - view.clip]);
    return [lower, upper];
  }
  const lower = given(view.vmin) ? view.vmin : nanMin(values);
  const upper = given(view.vmax) ? view.vmax : nanMax(values);
  return [lower, upper];
};

/** Values between 0 and 1, NaN where the pixel has no value */
const stretch = (value: Value, view: ViewSpec, size: number): Float32Array => {
  const values = typeof value === 'number' ? new Float32Array(size).fill(value) : value;
  const [lower, upper] = stretchRange(values, view);
  const range = upper - lower;
  // Without clip, vmin or vmax the values already span 0 to 1
  const clamp = given(view.clip) || given(view.vmin) || given(view.vmax);
  const result = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const v = values[i];
    if (Number.isNaN(v)) {
      result[i] = NaN;
    } else if (!(range > 0)) {
      // A flat band is black, as the server showed it
      result[i] = 0;
    } else {
      const scaled = (v - lower) / range;
      result[i] = clamp ? Math.min(1, Math.max(0, scaled)) : scaled;
    }
  }
  return result;
};

/** Expressions of a view, checked before reading any pixel */
export const viewExpressions = (view: ViewSpec) => {
  const sources = Array.isArray(view.data) ? view.data : [view.data];
  if (![1, 3, 4].includes(sources.length)) {
    throw new Error(`A view needs one, three or four expressions, not ${sources.length}`);
  }
  return sources.map((source) => parseExpression(String(source)));
};

export const renderView = (view: ViewSpec, raster: Raster): RenderedImage => {
  const { width, height } = raster;
  const size = width * height;
  const bands = viewExpressions(view).map((expression) =>
    stretch(evaluate(expression, raster), view, size)
  );
  const data = new Uint8ClampedArray(size * 4);

  if (bands.length === 1) {
    const table = colormapTable(view.cmap || 'jet');
    const colours = table.length / 3;
    const [band] = bands;
    for (let i = 0; i < size; i++) {
      if (Number.isNaN(band[i])) continue;
      const colour = 3 * colourIndex(band[i], colours);
      data[4 * i] = table[colour];
      data[4 * i + 1] = table[colour + 1];
      data[4 * i + 2] = table[colour + 2];
      data[4 * i + 3] = 255;
    }
  } else {
    const [red, green, blue, alpha] = bands;
    for (let i = 0; i < size; i++) {
      if (Number.isNaN(red[i]) || Number.isNaN(green[i]) || Number.isNaN(blue[i])) continue;
      // Truncated like numpy's astype('uint8')
      data[4 * i] = Math.trunc(255 * red[i]);
      data[4 * i + 1] = Math.trunc(255 * green[i]);
      data[4 * i + 2] = Math.trunc(255 * blue[i]);
      data[4 * i + 3] = alpha ? Math.trunc(255 * alpha[i]) : 255;
    }
  }
  return { width, height, data };
};

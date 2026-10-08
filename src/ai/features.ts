/**
 * What the AI sees of each pixel of the mask area
 *
 * The bands chosen in the settings (all by default), and optionally their
 * edges, the position of the pixel in a coarse grid and the superpixel it
 * belongs to, as the server computed them.
 */

import { ImagePixels, rasterOf } from '../raster/cog';
import { felzenszwalb } from '../raster/felzenszwalb';
import { sobel } from '../raster/filters';
import { parseExpression } from '../raster/expression';

export interface FeatureOptions {
  /** Bands such as $Sentinel2.B4; null or empty for all bands */
  bands?: string[] | null;
  use_edge_filter?: boolean;
  use_meshgrid?: boolean;
  /** "pixelwise" or "<columns>x<rows>" */
  meshgrid_cells?: string;
  use_superpixels?: boolean;
}

/** The selected bands of the image, cropped to the mask area */
const croppedBands = (
  pixels: ImagePixels,
  [x0, y0, x1, y1]: [number, number, number, number],
  bands: string[] | null | undefined
) => {
  const raster = rasterOf(pixels);
  const selected = bands?.length
    ? bands.map((band) => {
      const expression = parseExpression(band);
      if (expression.type !== 'band') throw new Error(`'${band}' is not a band`);
      return { file: expression.file, values: raster.band(expression.file, expression.band) };
    })
    : Object.entries(pixels.files).flatMap(([file, values]) => values.map((band) => ({ file, values: band })));

  const width = x1 - x0;
  const height = y1 - y0;
  const cropped = selected.map(({ values }) => {
    const out = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      out.set(values.subarray((y0 + y) * pixels.width + x0, (y0 + y) * pixels.width + x1), y * width);
    }
    return out;
  });

  // skimage scales integer images to 0..1 before edges and superpixels
  const ranges = selected.map(({ file }) => pixels.integerRange[file ?? Object.keys(pixels.files)[0]]);
  const scale = ranges.every((range) => range) ? 1 / Math.max(...(ranges as number[])) : 1;
  return { cropped, scale, width, height };
};

/** Index of the cell of each row (or column), as numpy.repeat(arange(cells), size // cells + 1) */
const cellIndex = (cells: number, size: number) => {
  const repeat = Math.trunc(size / cells) + 1;
  return (position: number) => Math.min(cells - 1, Math.floor(position / repeat));
};

export const pixelFeatures = (
  pixels: ImagePixels,
  maskArea: [number, number, number, number],
  options: FeatureOptions
): Float32Array[] => {
  const { cropped, scale, width, height } = croppedBands(pixels, maskArea, options.bands);
  const features: Float32Array[] = [...cropped];
  const scaled = () => (scale === 1 ? cropped : cropped.map((band) => band.map((v) => v * scale)));

  if (options.use_edge_filter) {
    for (const band of scaled()) features.push(sobel(band, width, height));
  }

  if (options.use_meshgrid) {
    // The server's grid: the columns split into the cells of meshgrid_cells,
    // the rows always into three
    const cells = options.meshgrid_cells === 'pixelwise' || !options.meshgrid_cells
      ? height
      : Number(options.meshgrid_cells.split('x')[0]) || 3;
    const byColumn = cellIndex(cells, height);
    const byRow = cellIndex(3, width);
    const columnCells = new Float32Array(width * height);
    const rowCells = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        columnCells[y * width + x] = byColumn(x);
        rowCells[y * width + x] = byRow(y);
      }
    }
    features.push(columnCells, rowCells);
  }

  if (options.use_superpixels) {
    const labels = felzenszwalb(scaled(), width, height, { scale: height / 5, sigma: 4, minSize: 100 });
    features.push(Float32Array.from(labels));
  }
  return features;
};

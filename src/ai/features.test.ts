import { describe, expect, it } from 'vitest';
import { pixelFeatures } from './features';
import type { ImagePixels } from '../raster/cog';

const pixels = (width: number, height: number): ImagePixels => ({
  width,
  height,
  files: { image: [new Float32Array(width * height)] },
  integerRange: { image: null },
  georef: { width, height, crs: 'EPSG:4326', corners: [[0, 0], [width, 0], [width, height], [0, height]] },
});

describe('pixelFeatures meshgrid', () => {
  it('uses the configured columns and rows on rectangular images', () => {
    const features = pixelFeatures(pixels(6, 4), [0, 0, 6, 4], {
      use_meshgrid: true,
      meshgrid_cells: '3x2',
    });

    const columns = features[1];
    const rows = features[2];
    expect(Array.from(columns.slice(0, 6))).toEqual([0, 0, 1, 1, 2, 2]);
    expect([rows[0], rows[6], rows[12], rows[18]]).toEqual([0, 0, 1, 1]);
  });

  it('uses one cell per pixel in pixelwise mode', () => {
    const features = pixelFeatures(pixels(3, 2), [0, 0, 3, 2], {
      use_meshgrid: true,
      meshgrid_cells: 'pixelwise',
    });
    expect(Array.from(features[1])).toEqual([0, 1, 2, 0, 1, 2]);
    expect(Array.from(features[2])).toEqual([0, 0, 0, 1, 1, 1]);
  });
});

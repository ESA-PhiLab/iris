import { describe, it, expect } from 'vitest';
import expected from './__fixtures__/expected.json';
import { renderView, ViewSpec } from './render';
import { colormapNames, colormapTable } from './colormaps';

// Views as Project.render_image computed them on the server
const { width, height, bands } = expected.tiny;
const raster = {
  width,
  height,
  band: (_file: string | null, band: number) => Float32Array.from(bands[band - 1]),
};

describe('renderView', () => {
  for (const [name, { view, rgb }] of Object.entries(expected.views)) {
    it(`renders ${name} like the server`, () => {
      const image = renderView(view as ViewSpec, raster);
      const colours = Array.from(image.data).filter((_, i) => i % 4 !== 3);
      const alpha = Array.from(image.data).filter((_, i) => i % 4 === 3);
      colours.forEach((value, i) => expect(Math.abs(value - rgb[i])).toBeLessThanOrEqual(1));
      expect(new Set(alpha)).toEqual(new Set([255]));
    });
  }

  it('leaves pixels without a value transparent', () => {
    const image = renderView({ data: 'log($B1 - 500)', cmap: 'gray' }, raster);
    const values = bands[0];
    values.forEach((value, i) => {
      expect(image.data[4 * i + 3]).toBe(value - 500 > 0 ? 255 : 0);
    });
  });

  it('shows a flat band black', () => {
    const image = renderView({ data: ['1', '1', '1'] }, raster);
    expect(Array.from(image.data.slice(0, 4))).toEqual([0, 0, 0, 255]);
  });

  it('refuses two expressions and clip with vmin', () => {
    expect(() => renderView({ data: ['$B1', '$B2'] }, raster)).toThrow(/one, three or four/);
    expect(() => renderView({ data: '$B1', clip: 2, vmin: 0 }, raster)).toThrow(/both 'clip'/);
  });
});

describe('colormaps', () => {
  it('has the matplotlib colormaps and their reversed versions', () => {
    expect(colormapNames()).toEqual(expect.arrayContaining(['jet', 'gray', 'viridis', 'terrain', 'tab10']));
    expect(Array.from(colormapTable('gray').slice(0, 3))).toEqual([0, 0, 0]);
    expect(Array.from(colormapTable('gray_r').slice(0, 3))).toEqual([255, 255, 255]);
    expect(colormapTable('tab10').length).toBe(30);
    expect(() => colormapTable('nope')).toThrow(/Unknown colormap/);
  });
});

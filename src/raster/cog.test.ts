import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import expected from './__fixtures__/expected.json';
import { readImage } from './cog';

// A 9 x 7 COG of 3 uint16 bands in UTM 33N, written with rasterio
const file = readFileSync(resolve(__dirname, '__fixtures__/tiny.tif'));
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;

describe('readImage', () => {
  it('reads every band and where the image lies', async () => {
    const image = await readImage({ Sentinel2: buffer });

    expect(image.width).toBe(expected.tiny.width);
    expect(image.height).toBe(expected.tiny.height);
    expect(image.files.Sentinel2.map((band) => Array.from(band))).toEqual(expected.tiny.bands);
    expect(image.integerRange.Sentinel2).toBe(65535);
    expect(image.georef.crs).toBe('EPSG:32633');
    image.georef.corners.forEach((corner, i) => {
      expect(corner[0]).toBeCloseTo(expected.tiny.corners[i][0], 9);
      expect(corner[1]).toBeCloseTo(expected.tiny.corners[i][1], 9);
    });
  });

  it('needs at least one file', async () => {
    await expect(readImage({})).rejects.toThrow(/no files/);
  });
});

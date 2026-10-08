import { describe, it, expect } from 'vitest';
import { fromArrayBuffer } from 'geotiff';
import { writeCog } from './writeCog';
import { readImage } from './cog';

const pattern = (width: number, height: number, seed: number) =>
  Uint8Array.from({ length: width * height }, (_, i) => (i * seed + (i >> 3)) % 251);

const toArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

describe('writeCog', () => {
  // Larger than one tile, so edge tiles are padded
  const width = 300;
  const height = 270;
  const bands = [pattern(width, height, 7), pattern(width, height, 13), pattern(width, height, 3)];
  const transform: [number, number, number, number, number, number] = [20, 0, 725080, 0, -20, 7083280];

  it('writes tiled bands that read back the same', async () => {
    const file = writeCog({ width, height, bands, epsg: 32749, transform, descriptions: ['Class', 'Drawn', 'Other'] });
    const image = await (await fromArrayBuffer(toArrayBuffer(file))).getImage();

    expect(image.getTileWidth()).toBe(256);
    expect(image.getSamplesPerPixel()).toBe(3);
    const rasters = await image.readRasters({ interleave: false }) as unknown as Uint8Array[];
    rasters.forEach((band, i) => expect(Array.from(band)).toEqual(Array.from(bands[i])));
    expect(image.getGeoKeys()?.ProjectedCSTypeGeoKey).toBe(32749);
    expect(image.getOrigin()).toEqual([725080, 7083280, 0]);
    expect(image.getResolution()).toEqual([20, -20, 0]);
    expect(String((image.fileDirectory as any).getValue(42112))).toContain('>Drawn</Item>');
  });

  it('places the image like the source', async () => {
    const file = writeCog({ width, height, bands: [bands[0]], epsg: 32749, transform });
    const pixels = await readImage({ mask: toArrayBuffer(file) });
    expect(pixels.georef.crs).toBe('EPSG:32749');
    expect(pixels.georef.transform).toEqual(transform);
    expect(pixels.georef.corners[0][0]).toBeCloseTo(113.2555, 3);
  });

  it('writes geographic and rotated georeferences', async () => {
    const rotated: [number, number, number, number, number, number] = [0.001, 0.0005, 10, 0.0005, -0.001, 50];
    const file = writeCog({ width: 4, height: 3, bands: [new Uint8Array(12)], epsg: 4326, geographic: true, transform: rotated });
    const image = await (await fromArrayBuffer(toArrayBuffer(file))).getImage();
    expect(image.getGeoKeys()?.GeographicTypeGeoKey).toBe(4326);
    expect(Array.from(image.fileDirectory.getValue('ModelTransformation') as number[])).toEqual(
      [0.001, 0.0005, 0, 10, 0.0005, -0.001, 0, 50, 0, 0, 0, 0, 0, 0, 0, 1]
    );
  });

  it('refuses bands of the wrong size', () => {
    expect(() => writeCog({ width: 2, height: 2, bands: [new Uint8Array(3)], epsg: 4326, transform })).toThrow();
  });
});

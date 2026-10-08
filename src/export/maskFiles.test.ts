import { describe, it, expect } from 'vitest';
import { maskCog, readMaskCog } from './maskFiles';
import { readImage } from '../raster/cog';

const georef = {
  width: 512, height: 512, crs: 'EPSG:32749', epsg: 32749,
  corners: [[0, 0], [0, 0], [0, 0], [0, 0]] as [number, number][] as any,
  transform: [20, 0, 725080, 0, -20, 7083280] as [number, number, number, number, number, number],
};

const buffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

describe('mask files', () => {
  it('writes the mask area like the server and reads it back', async () => {
    const mask = Uint8Array.from({ length: 6 * 4 }, (_, i) => i % 3);
    const userMask = Uint8Array.from({ length: 6 * 4 }, (_, i) => i % 2);
    const file = maskCog(georef, [64, 32, 70, 36], { mask, userMask });

    expect(await readMaskCog(buffer(file), 24)).toEqual({ mask, userMask });
    expect(await readMaskCog(buffer(file), 25)).toBeNull();

    const read = await readImage({ mask: buffer(file) });
    expect(read.georef.transform).toEqual([20, 0, 725080 + 64 * 20, 0, -20, 7083280 - 32 * 20]);
  });
});

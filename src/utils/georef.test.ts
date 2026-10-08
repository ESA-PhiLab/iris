import { describe, it, expect } from 'vitest';
import {
  Georef,
  areaCorners,
  cornersBounds,
  lngLatToMercator,
  lngLatToPixel,
  mercatorToLngLat,
  pixelToLngLat,
} from './georef';

// The "mountains" demo image: 512x512 pixels of 20 m in UTM zone 32N, which
// is slightly rotated on the map.
const georef: Georef = {
  width: 512,
  height: 512,
  crs: 'EPSG:32632',
  corners: [
    [7.993342633, 45.970812981],
    [8.12550114, 45.971900755],
    [8.126948075, 45.879746759],
    [7.995008152, 45.878662457],
  ],
};

describe('georef', () => {
  it('converts to Web Mercator and back', () => {
    const [x, y] = lngLatToMercator([0, 0]);
    expect(x).toBeCloseTo(0.5, 12);
    expect(y).toBeCloseTo(0.5, 12);

    const [lng, lat] = mercatorToLngLat(lngLatToMercator([8.06, 45.92]));
    expect(lng).toBeCloseTo(8.06, 10);
    expect(lat).toBeCloseTo(45.92, 10);
  });

  it('puts the image corners at the pixel corners', () => {
    const pixels: [number, number][] = [[0, 0], [512, 0], [512, 512], [0, 512]];
    pixels.forEach((pixel, i) => {
      const [lng, lat] = pixelToLngLat(georef, pixel);
      expect(lng).toBeCloseTo(georef.corners[i][0], 10);
      expect(lat).toBeCloseTo(georef.corners[i][1], 10);
    });
  });

  it('goes from pixels to the map and back', () => {
    const pixels: [number, number][] = [[0.5, 0.5], [100.25, 300.75], [511.9, 3], [256, 256], [-10, 600]];
    for (const pixel of pixels) {
      const [x, y] = lngLatToPixel(georef, pixelToLngLat(georef, pixel));
      expect(x).toBeCloseTo(pixel[0], 6);
      expect(y).toBeCloseTo(pixel[1], 6);
    }
  });

  it('gives the corners of a pixel area', () => {
    const corners = areaCorners(georef, [64, 64, 448, 448]);
    const [x0, y0] = lngLatToPixel(georef, corners[0]);
    const [x1, y1] = lngLatToPixel(georef, corners[2]);
    expect([x0, y0, x1, y1].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([64, 64, 448, 448]);
  });

  it('gives the bounding box of corners', () => {
    expect(cornersBounds(georef.corners)).toEqual([
      [7.993342633, 45.878662457],
      [8.126948075, 45.971900755],
    ]);
  });
});

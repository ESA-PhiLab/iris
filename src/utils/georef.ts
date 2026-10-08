/**
 * Where an image lies on the map
 *
 * The corners of the image are [longitude, latitude], clockwise from the top
 * left, read from the COG. The map views draw the image between these
 * corners with MapLibre's "flat" warp, which interpolates bilinearly in Web
 * Mercator. The functions here use the same interpolation to go between map
 * locations and image pixels, so the brush lands exactly on the pixels the
 * user sees.
 */

export type LngLat = [number, number];
export type Corners = [LngLat, LngLat, LngLat, LngLat];

export interface Georef {
  /** Image size in pixels */
  width: number;
  height: number;
  crs: string;
  /** Corners of the image: top left, top right, bottom right, bottom left */
  corners: Corners;
  /** EPSG code of the CRS, and whether it is geographic (degrees) */
  epsg?: number;
  geographic?: boolean;
  /** Pixel to CRS, as rasterio: x = a*col + b*row + c, y = d*col + e*row + f */
  transform?: [number, number, number, number, number, number];
  /** Bands of the files of the image, e.g. $Sentinel2.B4 */
  bands?: string[];
}

type Point = [number, number];

/** Web Mercator coordinates in [0, 1] (same as MapLibre's MercatorCoordinate) */
export const lngLatToMercator = ([lng, lat]: LngLat): Point => [
  (lng + 180) / 360,
  (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360,
];

export const mercatorToLngLat = ([x, y]: Point): LngLat => [
  x * 360 - 180,
  (360 / Math.PI) * Math.atan(Math.exp(((180 - y * 360) * Math.PI) / 180)) - 90,
];

const bilinear = (corners: Point[], u: number, v: number): Point => {
  const [tl, tr, br, bl] = corners;
  return [0, 1].map((i) =>
    (1 - u) * (1 - v) * tl[i] + u * (1 - v) * tr[i] + u * v * br[i] + (1 - u) * v * bl[i]
  ) as Point;
};

/** Map location of a pixel position (x right, y down, pixel edges at integers) */
export const pixelToLngLat = (georef: Georef, [x, y]: Point): LngLat =>
  mercatorToLngLat(
    bilinear(georef.corners.map(lngLatToMercator), x / georef.width, y / georef.height)
  );

/** Pixel position (continuous, see pixelToLngLat) of a map location */
export const lngLatToPixel = (georef: Georef, lngLat: LngLat): Point => {
  const [tl, tr, br, bl] = georef.corners.map(lngLatToMercator);
  const target = lngLatToMercator(lngLat);

  // Invert the bilinear interpolation with Newton's method. Images are nearly
  // parallelograms on the map, so this converges in very few steps.
  let u = 0.5;
  let v = 0.5;
  for (let step = 0; step < 8; step++) {
    const [px, py] = bilinear([tl, tr, br, bl], u, v);
    const dx = px - target[0];
    const dy = py - target[1];
    const du = [0, 1].map((i) => (1 - v) * (tr[i] - tl[i]) + v * (br[i] - bl[i]));
    const dv = [0, 1].map((i) => (1 - u) * (bl[i] - tl[i]) + u * (br[i] - tr[i]));
    const determinant = du[0] * dv[1] - dv[0] * du[1];
    if (determinant === 0) break;

    const stepU = (dx * dv[1] - dv[0] * dy) / determinant;
    const stepV = (du[0] * dy - dx * du[1]) / determinant;
    u -= stepU;
    v -= stepV;
    if (Math.abs(stepU) < 1e-12 && Math.abs(stepV) < 1e-12) break;
  }

  return [u * georef.width, v * georef.height];
};

/** Bounding box [[west, south], [east, north]] of corners */
export const cornersBounds = (corners: Corners): [LngLat, LngLat] => {
  const lngs = corners.map((corner) => corner[0]);
  const lats = corners.map((corner) => corner[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
};

/** Corners of a pixel area [x0, y0, x1, y1] of the image, same order as the image corners */
export const areaCorners = (georef: Georef, [x0, y0, x1, y1]: number[]): Corners => [
  pixelToLngLat(georef, [x0, y0]),
  pixelToLngLat(georef, [x1, y0]),
  pixelToLngLat(georef, [x1, y1]),
  pixelToLngLat(georef, [x0, y1]),
];

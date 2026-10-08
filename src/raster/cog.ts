/**
 * Read the COG files of an image in the browser
 *
 * An image can be split into several files (e.g. Sentinel-1 and Sentinel-2),
 * all of the same size. The pixels of all bands are read once and kept in
 * memory: the views and the AI need every pixel. The georeference comes from
 * the first file.
 */

import { GeoTIFFImage, fromArrayBuffer, fromUrl } from 'geotiff';
import type { Corners, Georef } from '../utils/georef';
import { toLngLat } from './crs';

/** Where a file of an image can be read from */
export interface ImageFileSource {
  url: string;
  headers?: Record<string, string>;
}

export interface ImagePixels {
  width: number;
  height: number;
  georef: Georef;
  /** Bands of each file, in the order of the file */
  files: Record<string, Float32Array[]>;
  /** Largest value of the integer type of each file, null for floats */
  integerRange: Record<string, number | null>;
}

/** Affine transform as rasterio writes it: x = a*col + b*row + c, y = d*col + e*row + f */
export type Affine = [number, number, number, number, number, number];

const GEOGRAPHIC_KEYS = ['ProjectedCSTypeGeoKey', 'GeographicTypeGeoKey'] as const;
const USER_DEFINED = 32767;

/** EPSG code of the coordinate reference system of an image */
export const imageEpsg = (image: GeoTIFFImage): number => {
  const keys = image.getGeoKeys() || {};
  for (const key of GEOGRAPHIC_KEYS) {
    const code = keys[key];
    if (typeof code === 'number' && code !== USER_DEFINED) return code;
  }
  throw new Error('The image has no EPSG coordinate reference system');
};

/** Affine transform of an image, from the pixel corner of (0, 0) */
export const imageTransform = (image: GeoTIFFImage): Affine => {
  const directory = image.fileDirectory;
  const matrix = directory.getValue('ModelTransformation') as number[] | undefined;
  let transform: Affine;
  if (matrix) {
    transform = [matrix[0], matrix[1], matrix[3], matrix[4], matrix[5], matrix[7]];
  } else {
    const tiepoint = directory.getValue('ModelTiepoint') as number[] | undefined;
    const scale = directory.getValue('ModelPixelScale') as number[] | undefined;
    if (!tiepoint || !scale) throw new Error('The image has no georeference');
    const [i, j, , x, y] = tiepoint;
    transform = [scale[0], 0, x - i * scale[0], 0, -scale[1], y + j * scale[1]];
  }

  // Like GDAL, take a point georeference to the corner of the pixel
  if (image.getGeoKeys()?.GTRasterTypeGeoKey === 2) {
    const [a, b, c, d, e, f] = transform;
    transform = [a, b, c - 0.5 * (a + b), d, e, f - 0.5 * (d + e)];
  }
  return transform;
};

const applyAffine = ([a, b, c, d, e, f]: Affine, col: number, row: number): [number, number] =>
  [a * col + b * row + c, d * col + e * row + f];

/** Where an image lies on the map: its corners clockwise from the top left */
export const imageGeoref = async (image: GeoTIFFImage): Promise<Georef> => {
  const width = image.getWidth();
  const height = image.getHeight();
  const epsg = imageEpsg(image);
  const transform = imageTransform(image);
  const pixels: Array<[number, number]> = [[0, 0], [width, 0], [width, height], [0, height]];
  const corners = await toLngLat(epsg, pixels.map(([col, row]) => applyAffine(transform, col, row)));
  return { width, height, crs: `EPSG:${epsg}`, corners: corners as Corners };
};

const INTEGER_RANGES: Record<string, number> = {
  Uint8Array: 255,
  Uint16Array: 65535,
  Uint32Array: 4294967295,
  Int8Array: 127,
  Int16Array: 32767,
  Int32Array: 2147483647,
};

const isRemote = (source: ImageFileSource | ArrayBuffer): source is ImageFileSource =>
  typeof (source as ImageFileSource).url === 'string';

const openFile = async (source: ImageFileSource | ArrayBuffer) => {
  const tiff = isRemote(source)
    ? await fromUrl(source.url, { headers: source.headers, allowFullFile: true })
    : await fromArrayBuffer(source);
  return tiff.getImage();
};

/** Read every band of every file of an image */
export const readImage = async (
  sources: Record<string, ImageFileSource | ArrayBuffer>
): Promise<ImagePixels> => {
  const ids = Object.keys(sources);
  if (!ids.length) throw new Error('The image has no files');

  const images = await Promise.all(ids.map((id) => openFile(sources[id])));
  const width = images[0].getWidth();
  const height = images[0].getHeight();
  images.forEach((image, i) => {
    if (image.getWidth() !== width || image.getHeight() !== height) {
      throw new Error(
        `The files of an image must have the same size, '${ids[i]}' has `
        + `${image.getWidth()}x${image.getHeight()} and '${ids[0]}' ${width}x${height}`
      );
    }
  });

  const files: Record<string, Float32Array[]> = {};
  const integerRange: Record<string, number | null> = {};
  await Promise.all(images.map(async (image, i) => {
    const rasters = await image.readRasters({ interleave: false });
    const bands = Array.from(rasters as ArrayLike<ArrayLike<number>>);
    integerRange[ids[i]] = INTEGER_RANGES[bands[0]?.constructor.name] ?? null;
    files[ids[i]] = bands.map((band) => (band instanceof Float32Array ? band : Float32Array.from(band)));
  }));

  return { width, height, georef: await imageGeoref(images[0]), files, integerRange };
};

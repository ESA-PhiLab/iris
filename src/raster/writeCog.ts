/**
 * Write a Cloud Optimized GeoTIFF of 8-bit bands in the browser
 *
 * Masks and exported images are small enough for one resolution: a tiled,
 * deflate compressed GeoTIFF whose header and tile index come before the
 * tiles. GDAL, rasterio and IRIS read it as a COG.
 */

import { zlibSync } from 'fflate';

export interface CogBands {
  width: number;
  height: number;
  /** One byte per pixel and band, row by row */
  bands: Uint8Array[];
  epsg: number;
  /** Whether the CRS is geographic (degrees) rather than projected */
  geographic?: boolean;
  /** Pixel to CRS, as rasterio: x = a*col + b*row + c, y = d*col + e*row + f */
  transform: [number, number, number, number, number, number];
  /** Name of each band, shown by GDAL and QGIS */
  descriptions?: string[];
}

const TILE = 256;

// TIFF field types
const SHORT = 3;
const LONG = 4;
const ASCII = 2;
const DOUBLE = 12;

type Field = { tag: number; type: number; values: number[] | string };

const typeSize = (type: number) => (type === DOUBLE ? 8 : type === LONG ? 4 : type === SHORT ? 2 : 1);

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Band descriptions as GDAL keeps them */
const gdalMetadata = (descriptions: string[]) =>
  '<GDALMetadata>'
  + descriptions.map((text, band) =>
    `<Item name="DESCRIPTION" sample="${band}" role="description">${escapeXml(text)}</Item>`).join('')
  + '</GDALMetadata>';

/** Pixels of one tile, all bands interleaved, padded with zeros at the edges */
const tilePixels = ({ width, height, bands }: CogBands, column: number, row: number) => {
  const count = bands.length;
  const pixels = new Uint8Array(TILE * TILE * count);
  const x0 = column * TILE;
  const y0 = row * TILE;
  for (let y = 0; y < TILE && y0 + y < height; y++) {
    for (let x = 0; x < TILE && x0 + x < width; x++) {
      const source = (y0 + y) * width + x0 + x;
      const target = (y * TILE + x) * count;
      for (let b = 0; b < count; b++) pixels[target + b] = bands[b][source];
    }
  }
  return pixels;
};

export const writeCog = (image: CogBands): Uint8Array => {
  const { width, height, bands, epsg, geographic = false, transform, descriptions } = image;
  const count = bands.length;
  if (!count) throw new Error('A GeoTIFF needs at least one band');
  bands.forEach((band) => {
    if (band.length !== width * height) throw new Error('Every band must have width x height pixels');
  });

  const columns = Math.ceil(width / TILE);
  const rows = Math.ceil(height / TILE);
  const tiles: Uint8Array[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      tiles.push(zlibSync(tilePixels(image, column, row), { level: 6 }));
    }
  }

  const [a, b, c, d, e, f] = transform;
  const geoKeys = [
    1, 1, 0, 3,
    1024, 0, 1, geographic ? 2 : 1, // GTModelType: projected or geographic
    1025, 0, 1, 1, // GTRasterType: pixels are areas
    geographic ? 2048 : 3072, 0, 1, epsg, // GeographicType or ProjectedCSType
  ];

  const fields: Field[] = [
    { tag: 256, type: LONG, values: [width] },
    { tag: 257, type: LONG, values: [height] },
    { tag: 258, type: SHORT, values: new Array(count).fill(8) },
    { tag: 259, type: SHORT, values: [8] }, // deflate
    { tag: 262, type: SHORT, values: [1] }, // black is zero
    { tag: 277, type: SHORT, values: [count] },
    { tag: 284, type: SHORT, values: [1] }, // bands interleaved by pixel
    { tag: 322, type: SHORT, values: [TILE] },
    { tag: 323, type: SHORT, values: [TILE] },
    { tag: 324, type: LONG, values: new Array(tiles.length).fill(0) },
    { tag: 325, type: LONG, values: tiles.map((tile) => tile.length) },
    ...(count > 1 ? [{ tag: 338, type: SHORT, values: new Array(count - 1).fill(0) }] : []),
    { tag: 339, type: SHORT, values: new Array(count).fill(1) }, // unsigned integers
    ...(b === 0 && d === 0
      ? [
        { tag: 33550, type: DOUBLE, values: [a, -e, 0] }, // ModelPixelScale
        { tag: 33922, type: DOUBLE, values: [0, 0, 0, c, f, 0] }, // ModelTiepoint
      ]
      : [{ tag: 34264, type: DOUBLE, values: [a, b, 0, c, d, e, 0, f, 0, 0, 0, 0, 0, 0, 0, 1] }]),
    { tag: 34735, type: SHORT, values: geoKeys },
    ...(descriptions?.length ? [{ tag: 42112, type: ASCII, values: gdalMetadata(descriptions) }] : []),
  ];

  // Layout: header, directory, values too long for the directory, tiles
  const directorySize = 2 + fields.length * 12 + 4;
  let offset = 8 + directorySize;
  const valueOffsets = fields.map((field) => {
    const size = typeof field.values === 'string'
      ? field.values.length + 1
      : field.values.length * typeSize(field.type);
    if (size <= 4) return -1;
    const at = offset;
    offset += size + (size % 2);
    return at;
  });
  const tileOffsets: number[] = [];
  for (const tile of tiles) {
    tileOffsets.push(offset);
    offset += tile.length;
  }
  (fields.find((field) => field.tag === 324)!.values as number[]).splice(0, tiles.length, ...tileOffsets);

  const file = new Uint8Array(offset);
  const view = new DataView(file.buffer);
  view.setUint16(0, 0x4949, true); // II: little endian
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, fields.length, true);

  const writeValues = (at: number, field: Field) => {
    if (typeof field.values === 'string') {
      for (let i = 0; i < field.values.length; i++) file[at + i] = field.values.charCodeAt(i) & 0x7f;
      file[at + field.values.length] = 0;
      return;
    }
    field.values.forEach((value, i) => {
      if (field.type === SHORT) view.setUint16(at + 2 * i, value, true);
      else if (field.type === LONG) view.setUint32(at + 4 * i, value, true);
      else view.setFloat64(at + 8 * i, value, true);
    });
  };

  fields.forEach((field, i) => {
    const entry = 10 + 12 * i;
    const length = typeof field.values === 'string' ? field.values.length + 1 : field.values.length;
    view.setUint16(entry, field.tag, true);
    view.setUint16(entry + 2, field.type, true);
    view.setUint32(entry + 4, length, true);
    if (valueOffsets[i] < 0) {
      writeValues(entry + 8, field);
    } else {
      view.setUint32(entry + 8, valueOffsets[i], true);
      writeValues(valueOffsets[i], field);
    }
  });
  view.setUint32(10 + 12 * fields.length, 0, true); // no next directory

  tiles.forEach((tile, i) => file.set(tile, tileOffsets[i]));
  return file;
};

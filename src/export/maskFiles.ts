/**
 * Mask files as the IRIS server writes them: a COG of the mask area with two
 * bands, the class of each pixel and whether the user drew it (1) or the AI
 * predicted it (0), georeferenced like the image
 */

import { fromArrayBuffer } from 'geotiff';
import { writeCog } from '../raster/writeCog';
import type { Georef } from '../utils/georef';
import type { UserMask } from '../services/backend';

export const maskCog = (
  georef: Georef,
  [x0, y0, x1, y1]: [number, number, number, number],
  { mask, userMask }: UserMask
): Uint8Array => {
  if (!georef.epsg || !georef.transform) throw new Error('The image has no georeference');
  const [a, b, c, d, e, f] = georef.transform;
  return writeCog({
    width: x1 - x0,
    height: y1 - y0,
    bands: [mask, userMask],
    epsg: georef.epsg,
    geographic: georef.geographic,
    transform: [a, b, a * x0 + b * y0 + c, d, e, d * x0 + e * y0 + f],
    descriptions: ['Class', 'Drawn by user'],
  });
};

/** Read a mask file back; null when it does not have the size of the mask area */
export const readMaskCog = async (bytes: ArrayBuffer, length: number): Promise<UserMask | null> => {
  const image = await (await fromArrayBuffer(bytes)).getImage();
  const [mask, userMask] = await image.readRasters({ interleave: false }) as unknown as Uint8Array[];
  if (!mask || mask.length !== length) return null;
  return { mask: new Uint8Array(mask), userMask: userMask ? new Uint8Array(userMask) : new Uint8Array(length) };
};

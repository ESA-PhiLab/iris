/**
 * Export images with their masks as GeoTIFF, made in the browser
 *
 * Each GeoTIFF covers the mask area: red, green and blue of the RGB view (or
 * NRGB, or the first view) and the class of each pixel, georeferenced like
 * the image.
 */

import { zipSync } from 'fflate';
import { rasterEngine } from '../raster/engine';
import type { ViewSpec } from '../raster/render';
import { writeCog } from '../raster/writeCog';
import { serverBackend } from '../services/serverBackend';
import type { ImageFileSource } from '../raster/cog';
import type { ProjectConfig } from '../types/iris';
import type { Georef } from '../utils/georef';

type Area = [number, number, number, number];

/** View whose colours go into the exports */
export const exportView = (views: Record<string, ViewSpec>): ViewSpec => {
  const view = views.RGB ?? views.NRGB
    ?? Object.values(views).find((candidate) => Array.isArray(candidate.data) && candidate.data.length === 3)
    ?? Object.values(views)[0];
  if (!view) throw new Error('The project has no view to export');
  return view;
};

/** GeoTIFF of the mask area with the colours of a view and a mask */
export const annotatedGeoTiff = async ({
  imageId, georef, maskArea, mask, description, view,
}: {
  imageId: string;
  georef: Georef;
  maskArea: Area;
  /** Class of each pixel of the mask area */
  mask: Uint8Array;
  description: string;
  view: ViewSpec;
}): Promise<Uint8Array> => {
  if (!georef.epsg || !georef.transform) throw new Error('The image has no georeference');
  const [x0, y0, x1, y1] = maskArea;
  const width = x1 - x0;
  const height = y1 - y0;
  const colours = await rasterEngine().render(imageId, view);
  const [red, green, blue] = [0, 1, 2].map((channel) => {
    const band = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        band[y * width + x] = colours.data[4 * ((y0 + y) * colours.width + x0 + x) + channel];
      }
    }
    return band;
  });

  const [a, b, c, d, e, f] = georef.transform;
  return writeCog({
    width,
    height,
    bands: [red, green, blue, mask],
    epsg: georef.epsg,
    geographic: georef.geographic,
    // The mask area starts at pixel (x0, y0) of the image
    transform: [a, b, a * x0 + b * y0 + c, d, e, d * x0 + e * y0 + f],
    descriptions: ['Red', 'Green', 'Blue', description],
  });
};

/** Let the browser save a file */
export const downloadFile = (bytes: Uint8Array, name: string, type = 'image/tiff') => {
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Where the merged masks and the images come from */
export interface MergedMasksSource {
  config: ProjectConfig;
  imageFiles(imageId: string): Promise<Record<string, ImageFileSource>>;
  /** Mask merged from the masks of all users, null when nobody annotated the image */
  mergedMask(imageId: string, length: number): Promise<Uint8Array | null>;
}

/** The server merges the masks of its users */
export const serverMergedMasks = async (): Promise<MergedMasksSource> => {
  const response = await fetch('/segmentation/api/config', { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Could not load the project (${response.status})`);
  const config = await response.json();
  return {
    config,
    imageFiles: (imageId) => serverBackend().imageFiles(config, imageId),
    async mergedMask(imageId) {
      const mask = await fetch(`/admin/api/merged-mask/${encodeURIComponent(imageId)}`, {
        credentials: 'same-origin',
      });
      if (mask.status === 404) return null;
      if (!mask.ok) throw new Error(`Could not load the merged mask of ${imageId} (${mask.status})`);
      return new Uint8Array(await mask.arrayBuffer());
    },
  };
};

/**
 * GeoTIFFs of the images with the masks merged from all users, in a zip when
 * there are several; null when no image has masks
 */
export const exportMergedImages = async (
  imageIds: string[],
  onProgress: (done: number, total: number) => void = () => {},
  source?: MergedMasksSource
): Promise<{ bytes: Uint8Array; name: string; count: number } | null> => {
  const { config, imageFiles, mergedMask } = source ?? await serverMergedMasks();
  const view = exportView((config as any).views);

  const files: Record<string, Uint8Array> = {};
  for (const [i, imageId] of imageIds.entries()) {
    onProgress(i, imageIds.length);
    // Look for masks before reading the image, when the size of the mask area is known
    const area: Area | undefined = config.segmentation?.mask_area;
    const size = (a: Area) => (a[2] - a[0]) * (a[3] - a[1]);
    let mask = area ? await mergedMask(imageId, size(area)) : null;
    if (area && !mask) continue;
    const georef = await rasterEngine().open(imageId, await imageFiles(imageId));
    const maskArea: Area = area ?? [0, 0, georef.width, georef.height];
    mask = mask ?? await mergedMask(imageId, size(maskArea));
    if (!mask) continue;
    files[`${imageId}_merged.tif`] = await annotatedGeoTiff({
      imageId, georef, maskArea, mask, description: 'Merged Segmentation Mask', view,
    });
  }
  onProgress(imageIds.length, imageIds.length);

  const names = Object.keys(files);
  if (!names.length) return null;
  if (names.length === 1) return { bytes: files[names[0]], name: names[0], count: 1 };
  // The GeoTIFFs are compressed already
  const zip = zipSync(Object.fromEntries(names.map((name) => [name, [files[name], { level: 0 }]])));
  return { bytes: zip, name: `${config.name || 'iris'}_merged_masks.zip`, count: names.length };
};

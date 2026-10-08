/**
 * Where the browser reads the COG files of an image
 *
 * images.path of the project is either one path or one path per file id,
 * e.g. {"Sentinel1": ..., "Sentinel2": ...}. The server serves each file.
 */

import type { ImageFileSource } from '../raster/cog';

interface ImagesConfig {
  images?: { path?: string | Record<string, string> };
}

/** Ids of the files of each image, as the band expressions name them */
export const imageFileIds = (config: ImagesConfig): string[] => {
  const path = config.images?.path;
  if (path && typeof path === 'object') return Object.keys(path);
  // The server names a single path 'pictures'
  return ['pictures'];
};

export const imageFileSources = (
  config: ImagesConfig,
  imageId: string
): Record<string, ImageFileSource> => Object.fromEntries(
  imageFileIds(config).map((fileId) => [fileId, {
    // Absolute, the worker would resolve it against its own location
    url: new URL(
      `/segmentation/api/file/${encodeURIComponent(imageId)}/${encodeURIComponent(fileId)}`,
      window.location.href
    ).href,
  }])
);

/**
 * Images kept in memory and the views rendered from them
 *
 * Runs in the raster worker, or in the page where workers are not available
 * (tests).
 */

import type { Georef } from '../utils/georef';
import { ImageFileSource, ImagePixels, readImage } from './cog';
import type { Raster } from './expression';
import { RenderedImage, ViewSpec, renderView } from './render';

/** How many images stay in memory: the current one and the one before */
const KEPT_IMAGES = 2;

export const rasterOf = (pixels: ImagePixels): Raster => ({
  width: pixels.width,
  height: pixels.height,
  band: (file, band) => {
    const ids = Object.keys(pixels.files);
    if (file === null && ids.length > 1) {
      throw new Error(`The image has several files, write the band as $${ids[0]}.B${band}`);
    }
    const bands = pixels.files[file ?? ids[0]];
    if (!bands) {
      throw new Error(`The image has no file '${file}', it has ${ids.join(', ')}`);
    }
    if (band > bands.length) {
      throw new Error(`$${file ? `${file}.` : ''}B${band} does not exist, the file has ${bands.length} bands`);
    }
    return bands[band - 1];
  },
});

export const createRasterCore = () => {
  const images = new Map<string, Promise<ImagePixels>>();

  const pixelsOf = (imageId: string) => {
    const pixels = images.get(imageId);
    if (!pixels) throw new Error(`Image '${imageId}' is not open`);
    return pixels;
  };

  return {
    async open(imageId: string, sources: Record<string, ImageFileSource>): Promise<Georef> {
      let pixels = images.get(imageId);
      if (!pixels) {
        pixels = readImage(sources);
        images.set(imageId, pixels);
        pixels.catch(() => images.delete(imageId));
      } else {
        // Most recently used last
        images.delete(imageId);
        images.set(imageId, pixels);
      }
      while (images.size > KEPT_IMAGES) {
        images.delete(images.keys().next().value as string);
      }
      return (await pixels).georef;
    },

    async render(imageId: string, view: ViewSpec): Promise<RenderedImage> {
      return renderView(view, rasterOf(await pixelsOf(imageId)));
    },

    async pixels(imageId: string): Promise<ImagePixels> {
      return pixelsOf(imageId);
    },
  };
};

export type RasterCore = ReturnType<typeof createRasterCore>;

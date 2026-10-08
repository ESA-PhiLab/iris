/**
 * Images kept in memory and the views rendered from them
 *
 * Runs in the raster worker, or in the page where workers are not available
 * (tests).
 */

import type { Georef } from '../utils/georef';
import { ImageFileSource, ImagePixels, rasterOf, readImage } from './cog';
import { RenderedImage, ViewSpec, renderView } from './render';
import { PredictionRequest, predictMask } from '../ai/segment';

/** How many images stay in memory: the current one and the one before */
const KEPT_IMAGES = 2;

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

    /** Train the AI on the drawn pixels and predict the whole mask area */
    async predict(imageId: string, request: PredictionRequest): Promise<Uint8Array> {
      return predictMask(await pixelsOf(imageId), request);
    },
  };
};

export type RasterCore = ReturnType<typeof createRasterCore>;

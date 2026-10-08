/**
 * Read images and render views in the browser
 *
 * The work happens in a web worker so the page stays responsive. Rendered
 * views are cached: several map views showing the same view, or coming back
 * to an image, do not compute it again.
 */

import type { Georef } from '../utils/georef';
import type { ImageFileSource } from './cog';
import type { RenderedImage, ViewSpec } from './render';

export interface RasterEngine {
  /** Start reading an image, resolves with its georeference */
  open(imageId: string, sources: Record<string, ImageFileSource>): Promise<Georef>;
  /** Pixels of a view of an open image */
  render(imageId: string, view: ViewSpec): Promise<RenderedImage>;
}

const workerEngine = (): RasterEngine => {
  const worker = new Worker(new URL('./raster.worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  let nextId = 0;

  worker.onmessage = (event: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
    const { id, result, error } = event.data;
    const request = pending.get(id);
    pending.delete(id);
    if (error !== undefined) request?.reject(new Error(error));
    else request?.resolve(result);
  };

  const call = <T>(method: string, ...args: unknown[]) => new Promise<T>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, method, args });
  });

  return {
    open: (imageId, sources) => call<Georef>('open', imageId, sources),
    render: (imageId, view) => call<RenderedImage>('render', imageId, view),
  };
};

/** Without workers (tests), the same code runs in the page */
const pageEngine = (): RasterEngine => {
  const core = import('./core').then(({ createRasterCore }) => createRasterCore());
  return {
    open: async (imageId, sources) => (await core).open(imageId, sources),
    render: async (imageId, view) => (await core).render(imageId, view),
  };
};

/** Views rendered so far, by image and view */
const rendered = new Map<string, Promise<RenderedImage>>();
const KEPT_RENDERS = 32;

const cached = (engine: RasterEngine): RasterEngine => ({
  open: engine.open,
  render: (imageId, view) => {
    const key = JSON.stringify([imageId, view.data, view.cmap, view.clip, view.vmin, view.vmax]);
    let image = rendered.get(key);
    if (!image) {
      image = engine.render(imageId, view);
      image.catch(() => rendered.delete(key));
      rendered.set(key, image);
      while (rendered.size > KEPT_RENDERS) {
        rendered.delete(rendered.keys().next().value as string);
      }
    }
    return image;
  },
});

let engine: RasterEngine | null = null;

export const rasterEngine = (): RasterEngine => {
  if (!engine) {
    engine = cached(typeof Worker === 'undefined' ? pageEngine() : workerEngine());
  }
  return engine;
};

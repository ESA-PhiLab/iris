/**
 * Worker that reads the images and renders their views, off the page's thread
 */

import { createRasterCore } from './core';
import type { RenderedImage } from './render';

const core = createRasterCore();

type Request = { id: number; method: 'open' | 'render' | 'predict'; args: unknown[] };

self.onmessage = async (event: MessageEvent<Request>) => {
  const { id, method, args } = event.data;
  try {
    const result = await (core[method] as (...args: unknown[]) => Promise<unknown>)(...args);
    // Hand the pixels over without copying them
    const transfer = method === 'render'
      ? [(result as RenderedImage).data.buffer]
      : method === 'predict' ? [(result as Uint8Array).buffer] : [];
    self.postMessage({ id, result }, { transfer });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};

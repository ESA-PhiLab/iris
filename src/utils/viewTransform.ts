/**
 * View transform persistence
 *
 * Zoom and pan live in each view canvas's 2D context transform. Whenever the
 * viewports are remounted (switching view group, adding or removing a view)
 * the canvases are recreated and would otherwise fall back to the default
 * fit-to-canvas transform. To carry zoom and pan across remounts we describe
 * the transform in image space, independent of canvas pixel size:
 *
 *   zoom    - magnification relative to the fit-to-canvas scale
 *   originX - image x coordinate shown at the canvas's left edge
 *   originY - image y coordinate shown at the canvas's top edge
 */

export interface ViewTransform {
  zoom: number;
  originX: number;
  originY: number;
}

/** imageShape is [height, width], as returned by getImageShapeFromStore. */
export type ImageShape = [number, number];

/** Scale that fits the whole image into the canvas, per axis. */
export function fitScale(
  canvas: { width: number; height: number },
  imageShape: ImageShape,
): { x: number; y: number } {
  return {
    x: canvas.width / imageShape[1],
    y: canvas.height / imageShape[0],
  };
}

/** Whether a stored transform is (within rounding) the default fit view. */
export function isDefaultViewTransform(t: ViewTransform | null): boolean {
  if (!t) return true;
  return (
    Math.abs(t.zoom - 1) < 1e-6 &&
    Math.abs(t.originX) < 1e-6 &&
    Math.abs(t.originY) < 1e-6
  );
}

/** Read the current zoom and pan of a canvas in image-space terms. */
export function readViewTransform(
  canvas: HTMLCanvasElement,
  imageShape: ImageShape,
): ViewTransform | null {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width === 0 || canvas.height === 0) return null;

  const m = ctx.getTransform();
  if (!m || m.a === 0 || m.d === 0) return null;

  const fit = fitScale(canvas, imageShape);
  return {
    zoom: m.a / fit.x,
    originX: -m.e / m.a,
    originY: -m.f / m.d,
  };
}

/**
 * Apply a stored transform to a (possibly freshly created) canvas context.
 * With no stored transform the canvas gets the default fit-to-canvas view.
 */
export function applyViewTransform(
  ctx: CanvasRenderingContext2D,
  canvas: { width: number; height: number },
  imageShape: ImageShape,
  saved: ViewTransform | null,
): void {
  const fit = fitScale(canvas, imageShape);
  const t = saved && !isDefaultViewTransform(saved) ? saved : null;
  const zoom = t ? t.zoom : 1;
  const a = fit.x * zoom;
  const d = fit.y * zoom;
  const e = t ? -t.originX * a : 0;
  const f = t ? -t.originY * d : 0;
  ctx.setTransform(a, 0, 0, d, e, f);
}

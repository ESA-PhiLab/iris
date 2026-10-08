/**
 * Where the brush paints
 *
 * The brush is a square of size x size image pixels centred on the cursor. The
 * cursor is in image pixels with decimals: (10.5, 3.5) is the centre of
 * pixel (10, 3).
 */

/** Pixels from x0, y0 up to (not including) x1, y1 */
export type Rect = [number, number, number, number];

/** First pixel the brush covers along one axis */
const brushStart = (centre: number, size: number) => Math.floor(centre - size / 2 + 0.5);

/** Pixels of the image under the brush */
export const brushImageRect = ([x, y]: [number, number], size: number): Rect => {
  const x0 = brushStart(x, size);
  const y0 = brushStart(y, size);
  return [x0, y0, x0 + size, y0 + size];
};

/**
 * Pixels of the mask under the brush, or null when the brush is outside
 *
 * maskArea is the part of the image the mask covers, [x0, y0, x1, y1].
 */
export const brushMaskRect = (
  cursor: [number, number],
  size: number,
  maskArea: [number, number, number, number]
): Rect | null => {
  const [x0, y0, x1, y1] = brushImageRect(cursor, size);
  const [ax0, ay0, ax1, ay1] = maskArea;
  const rect: Rect = [
    Math.max(x0, ax0) - ax0,
    Math.max(y0, ay0) - ay0,
    Math.min(x1, ax1) - ax0,
    Math.min(y1, ay1) - ay0,
  ];
  return rect[0] < rect[2] && rect[1] < rect[3] ? rect : null;
};

/**
 * Cursor positions between two points of a stroke, one pixel apart, so a fast
 * stroke leaves no gaps. The start is not included, the end is.
 */
export const strokePositions = (
  from: [number, number],
  to: [number, number]
): Array<[number, number]> => {
  const steps = Math.ceil(Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])));
  if (steps <= 1) return [to];
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as [number, number];
  });
};

/** Smallest rect holding both, null counts as empty */
export const unionRect = (a: Rect | null, b: Rect | null): Rect | null => {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
};

/** Set the pixels of a rect of the mask (width pixels per row) */
export const fillRect = (
  mask: Uint8Array,
  userMask: Uint8Array,
  width: number,
  [x0, y0, x1, y1]: Rect,
  classId: number,
  drawn: 0 | 1
) => {
  for (let y = y0; y < y1; y++) {
    mask.fill(classId, y * width + x0, y * width + x1);
    userMask.fill(drawn, y * width + x0, y * width + x1);
  }
};

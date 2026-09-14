import { describe, it, expect } from 'vitest';
import { applyViewTransform, readViewTransform, isDefaultViewTransform, fitScale } from './viewTransform';

// Minimal 2D context stub that records setTransform and answers getTransform
function makeCanvas(width: number, height: number) {
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const ctx = {
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
      m = { a, b, c, d, e, f };
    },
    getTransform: () => m,
  } as unknown as CanvasRenderingContext2D;
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ctx, current: () => m };
}

const imageShape: [number, number] = [512, 1024]; // height, width

describe('viewTransform', () => {
  it('fitScale maps image extent onto the canvas', () => {
    expect(fitScale({ width: 400, height: 200 }, imageShape)).toEqual({ x: 400 / 1024, y: 200 / 512 });
  });

  it('applies the default fit view when nothing is saved', () => {
    const { ctx, canvas, current } = makeCanvas(400, 200);
    applyViewTransform(ctx, canvas, imageShape, null);
    expect(current()).toEqual({ a: 400 / 1024, b: 0, c: 0, d: 200 / 512, e: 0, f: 0 });
  });

  it('reads back what it applied', () => {
    const { ctx, canvas } = makeCanvas(400, 200);
    const saved = { zoom: 3, originX: 100, originY: 50 };
    applyViewTransform(ctx, canvas, imageShape, saved);
    const read = readViewTransform(canvas, imageShape)!;
    expect(read.zoom).toBeCloseTo(3);
    expect(read.originX).toBeCloseTo(100);
    expect(read.originY).toBeCloseTo(50);
  });

  it('carries the same image-space view onto a canvas of a different size', () => {
    const small = makeCanvas(400, 200);
    applyViewTransform(small.ctx, small.canvas, imageShape, { zoom: 2, originX: 256, originY: 128 });
    const saved = readViewTransform(small.canvas, imageShape)!;

    const large = makeCanvas(800, 400);
    applyViewTransform(large.ctx, large.canvas, imageShape, saved);
    const m = large.current();
    // Image point (256, 128) should sit at the canvas origin
    expect(m.a * 256 + m.e).toBeCloseTo(0);
    expect(m.d * 128 + m.f).toBeCloseTo(0);
    // and magnification is twice the fit scale of the new canvas
    expect(m.a).toBeCloseTo(2 * 800 / 1024);
    expect(m.d).toBeCloseTo(2 * 400 / 512);
  });

  it('treats the fit view as default', () => {
    expect(isDefaultViewTransform(null)).toBe(true);
    expect(isDefaultViewTransform({ zoom: 1, originX: 0, originY: 0 })).toBe(true);
    expect(isDefaultViewTransform({ zoom: 1.5, originX: 0, originY: 0 })).toBe(false);
  });
});

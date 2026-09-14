import { describe, it, expect, beforeEach } from 'vitest';
import { createCoordinateTransform, updateCursorCoords, addTrackTransforms } from './coordinateTransform';

describe('coordinateTransform', () => {
  describe('createCoordinateTransform', () => {
    it('creates transform with correct scaling', () => {
      const transform = createCoordinateTransform(800, 600, 400, 300);
      expect(transform.scaleX).toBe(2);
      expect(transform.scaleY).toBe(2);
    });

    it('converts canvas to image coordinates', () => {
      const transform = createCoordinateTransform(800, 600, 400, 300);
      const result = transform.canvasToImage(100, 100);
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });

  describe('updateCursorCoords', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockEvent: MouseEvent;

    beforeEach(() => {
      mockCanvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }),
        width: 100,
        height: 100,
        getContext: () => ({ getWorldCoords: (x: number, y: number) => ({ x, y }) }),
      } as any;

      mockEvent = { clientX: 50, clientY: 50 } as MouseEvent;
      (window as any).vars = { cursor_canvas: [], cursor_image: [] };
    });

    it('updates cursor coordinates', () => {
      updateCursorCoords(mockCanvas, mockEvent);
      expect((window as any).vars.cursor_canvas).toEqual([50, 50]);
    });
  });

  describe('addTrackTransforms', () => {
    it('applies trackTransforms when available', () => {
      const mockCtx = {} as CanvasRenderingContext2D;
      (window as any).trackTransforms = vi.fn();

      addTrackTransforms(mockCtx);
      expect((window as any).trackTransforms).toHaveBeenCalledWith(mockCtx);
    });

    it('provides fallback when trackTransforms unavailable', () => {
      const mockCtx = {} as CanvasRenderingContext2D;
      (window as any).trackTransforms = undefined;

      addTrackTransforms(mockCtx);
      expect((mockCtx as any).getWorldCoords).toBeDefined();
    });
  });
});
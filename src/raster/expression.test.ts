import { describe, it, expect } from 'vitest';
import { ExpressionError, Raster, evaluate, expressionBands, parseExpression } from './expression';

const raster = (bands: Record<string, number[][]>, width: number, height: number): Raster => ({
  width,
  height,
  band: (file, band) => Float32Array.from(bands[file ?? 'image'][band - 1]),
});

const compute = (source: string, bands: number[][] = [[1, 2, 3, 4]]) =>
  evaluate(parseExpression(source), raster({ image: bands }, 2, 2));

describe('band expressions', () => {
  it('follows the precedence of Python', () => {
    expect(compute('1 + 2 * 3')).toBe(7);
    expect(compute('(1 + 2) * 3')).toBe(9);
    expect(compute('-2**2')).toBe(-4);
    expect(compute('2**-1')).toBe(0.5);
    expect(compute('2**3**2')).toBe(512);
    expect(compute('7 // 2 + 7 % 3')).toBe(4);
    expect(compute('-7 % 3')).toBe(2);
    expect(compute('1.5e1 / 1_0')).toBe(1.5);
    expect(compute('PI')).toBeCloseTo(Math.PI);
  });

  it('computes every pixel of the bands', () => {
    expect(Array.from(compute('$B1*2 + $B2', [[1, 2, 3, 4], [10, 20, 30, 40]]) as Float32Array))
      .toEqual([12, 24, 36, 48]);
    expect(Array.from(compute('$B1 > 2') as Float32Array)).toEqual([0, 0, 1, 1]);
    expect(Array.from(compute('log(exp($B1))') as Float32Array).map(Math.round)).toEqual([1, 2, 3, 4]);
  });

  it('reduces with max, min, mean and median like numpy', () => {
    expect(compute('max($B1)')).toBe(4);
    expect(compute('min($B1)')).toBe(1);
    expect(compute('mean($B1)')).toBe(2.5);
    expect(compute('median($B1)')).toBe(2.5);
    expect(Array.from(compute('$B1 - min($B1)') as Float32Array)).toEqual([0, 1, 2, 3]);
    expect(Array.from(compute('max($B1, 2.5)') as Float32Array)).toEqual([2.5, 2.5, 3, 4]);
  });

  it('reads the bands of named files', () => {
    const expression = parseExpression('$Sentinel2.B4 - $Sentinel1.B1');
    expect(expressionBands(expression)).toEqual([['Sentinel2', 4], ['Sentinel1', 1]]);
    const result = evaluate(expression, raster({
      Sentinel1: [[1, 1, 1, 1]],
      Sentinel2: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [5, 6, 7, 8]],
    }, 2, 2));
    expect(Array.from(result as Float32Array)).toEqual([4, 5, 6, 7]);
  });

  it('takes keyword arguments for superpixels', () => {
    const labels = compute('superpixels($B1, sigma=0, min_size=1, scale=0)') as Float32Array;
    // Without smoothing and scale, every pixel of a ramp is its own segment
    expect(Array.from(labels)).toEqual([0, 1, 2, 3]);
  });

  it('explains what is wrong', () => {
    expect(() => parseExpression('$B1 +')).toThrow(ExpressionError);
    expect(() => parseExpression('$B1 $B2')).toThrow(/Unexpected '\$B2'/);
    expect(() => parseExpression('$Sentinel2.VV')).toThrow(/not a band/);
    expect(() => parseExpression('$B1 ; 2')).toThrow(/Unexpected ';'/);
    expect(() => compute('foo($B1)')).toThrow(/Unknown function 'foo'/);
    expect(() => compute('bar')).toThrow(/Unknown name 'bar'/);
    expect(() => compute('edges(1)')).toThrow(/needs an image/);
    expect(() => compute('superpixels($B1, colour=2)')).toThrow(/no argument 'colour'/);
  });
});

/**
 * Band expressions of the views
 *
 * A view shows one or three expressions such as `$Sentinel2.B4*1.5` or
 * `edges($B11**0.8)`. They follow Python syntax and numpy semantics, as they
 * did when the server evaluated them: arithmetic, comparisons, `PI`, the
 * functions of FUNCTIONS and bands written `$File.Bn` or `$Bn`.
 */

import { felzenszwalb } from './felzenszwalb';
import { nanMax, nanMean, nanMedian, nanMin, sobel } from './filters';

export type Expression =
  | { type: 'number'; value: number }
  | { type: 'band'; file: string | null; band: number }
  | { type: 'name'; name: string }
  | { type: 'unary'; op: '+' | '-'; operand: Expression }
  | { type: 'binary'; op: string; left: Expression; right: Expression }
  | { type: 'call'; name: string; args: Expression[]; kwargs: Record<string, Expression> };

/** A number or one value per pixel */
export type Value = number | Float32Array;

export interface Raster {
  width: number;
  height: number;
  /** Pixels of a band, 1-based as in `$B1`; file is null for `$Bn` */
  band: (file: string | null, band: number) => Float32Array;
}

export class ExpressionError extends Error {}

type Token = { kind: 'number' | 'name' | 'band' | 'op' | 'end'; text: string; position: number };

const OPERATORS = ['**', '//', '<=', '>=', '==', '!=', '+', '-', '*', '/', '%', '<', '>', '(', ')', ',', '='];

const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const space = /^\s+/.exec(rest);
    if (space) {
      i += space[0].length;
      continue;
    }
    const number = /^(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?/.exec(rest);
    if (number) {
      tokens.push({ kind: 'number', text: number[0], position: i });
      i += number[0].length;
      continue;
    }
    const band = /^\$\w+(?:\.\w+)?/.exec(rest);
    if (band) {
      tokens.push({ kind: 'band', text: band[0], position: i });
      i += band[0].length;
      continue;
    }
    const name = /^[A-Za-z_]\w*/.exec(rest);
    if (name) {
      tokens.push({ kind: 'name', text: name[0], position: i });
      i += name[0].length;
      continue;
    }
    const op = OPERATORS.find((candidate) => rest.startsWith(candidate));
    if (!op) {
      throw new ExpressionError(`Unexpected '${rest[0]}' at position ${i + 1} of '${source}'`);
    }
    tokens.push({ kind: 'op', text: op, position: i });
    i += op.length;
  }
  tokens.push({ kind: 'end', text: '', position: source.length });
  return tokens;
};

const parseBand = (text: string): { file: string | null; band: number } => {
  const match = /^\$(?:(\w+)\.)?B(\d+)$/.exec(text);
  if (!match || Number(match[2]) < 1) {
    throw new ExpressionError(`'${text}' is not a band, write $B1 or $File.B1`);
  }
  return { file: match[1] ?? null, band: Number(match[2]) };
};

/** Parse an expression of a view */
export const parseExpression = (source: string): Expression => {
  const tokens = tokenize(source);
  let index = 0;
  const peek = () => tokens[index];
  const next = () => tokens[index++];
  const fail = (token: Token): never => {
    const what = token.kind === 'end' ? 'end' : `'${token.text}'`;
    throw new ExpressionError(`Unexpected ${what} at position ${token.position + 1} of '${source}'`);
  };
  const expect = (text: string) => {
    const token = next();
    if (token.text !== text || token.kind !== 'op') fail(token);
  };
  const isOp = (...texts: string[]) => peek().kind === 'op' && texts.includes(peek().text);

  const comparison = (): Expression => {
    let left = sum();
    while (isOp('<', '>', '<=', '>=', '==', '!=')) {
      const op = next().text;
      left = { type: 'binary', op, left, right: sum() };
    }
    return left;
  };
  const sum = (): Expression => {
    let left = term();
    while (isOp('+', '-')) {
      const op = next().text;
      left = { type: 'binary', op, left, right: term() };
    }
    return left;
  };
  const term = (): Expression => {
    let left = factor();
    while (isOp('*', '/', '//', '%')) {
      const op = next().text;
      left = { type: 'binary', op, left, right: factor() };
    }
    return left;
  };
  // Unary signs bind weaker than **: -2**2 is -4, 2**-1 is 0.5
  const factor = (): Expression => {
    if (isOp('+', '-')) {
      const op = next().text as '+' | '-';
      return { type: 'unary', op, operand: factor() };
    }
    return power();
  };
  const power = (): Expression => {
    const base = primary();
    if (isOp('**')) {
      next();
      return { type: 'binary', op: '**', left: base, right: factor() };
    }
    return base;
  };
  const primary = (): Expression => {
    const token = next();
    if (token.kind === 'number') {
      return { type: 'number', value: Number(token.text.replace(/_/g, '')) };
    }
    if (token.kind === 'band') {
      return { type: 'band', ...parseBand(token.text) };
    }
    if (token.kind === 'name') {
      if (!isOp('(')) return { type: 'name', name: token.text };
      next();
      const args: Expression[] = [];
      const kwargs: Record<string, Expression> = {};
      while (!isOp(')')) {
        if (peek().kind === 'name' && tokens[index + 1].text === '=') {
          const keyword = next().text;
          next();
          kwargs[keyword] = comparison();
        } else {
          if (Object.keys(kwargs).length) fail(peek());
          args.push(comparison());
        }
        if (!isOp(')')) expect(',');
      }
      next();
      return { type: 'call', name: token.text, args, kwargs };
    }
    if (token.kind === 'op' && token.text === '(') {
      const inner = comparison();
      expect(')');
      return inner;
    }
    return fail(token);
  };

  const expression = comparison();
  if (peek().kind !== 'end') fail(peek());
  return expression;
};

/** Bands an expression reads, as [file, band] */
export const expressionBands = (expression: Expression): Array<[string | null, number]> => {
  switch (expression.type) {
    case 'band':
      return [[expression.file, expression.band]];
    case 'unary':
      return expressionBands(expression.operand);
    case 'binary':
      return [...expressionBands(expression.left), ...expressionBands(expression.right)];
    case 'call':
      return [...expression.args, ...Object.values(expression.kwargs)].flatMap(expressionBands);
    default:
      return [];
  }
};

const elementwise = (value: Value, fn: (x: number) => number): Value => {
  if (typeof value === 'number') return fn(value);
  const result = new Float32Array(value.length);
  for (let i = 0; i < value.length; i++) result[i] = fn(value[i]);
  return result;
};

const combine = (left: Value, right: Value, fn: (a: number, b: number) => number): Value => {
  if (typeof left === 'number' && typeof right === 'number') return fn(left, right);
  const size = typeof left === 'number' ? (right as Float32Array).length : left.length;
  const result = new Float32Array(size);
  if (typeof left === 'number') {
    for (let i = 0; i < size; i++) result[i] = fn(left, (right as Float32Array)[i]);
  } else if (typeof right === 'number') {
    for (let i = 0; i < size; i++) result[i] = fn(left[i], right);
  } else {
    for (let i = 0; i < size; i++) result[i] = fn(left[i], right[i]);
  }
  return result;
};

/** Python's modulo takes the sign of the divisor */
const modulo = (a: number, b: number) => a - Math.floor(a / b) * b;

const BINARY: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '//': (a, b) => Math.floor(a / b),
  '%': modulo,
  '**': (a, b) => a ** b,
  '<': (a, b) => Number(a < b),
  '>': (a, b) => Number(a > b),
  '<=': (a, b) => Number(a <= b),
  '>=': (a, b) => Number(a >= b),
  '==': (a, b) => Number(a === b),
  '!=': (a, b) => Number(a !== b),
};

const NAMES: Record<string, number> = { PI: Math.PI };

const ELEMENTWISE: Record<string, (x: number) => number> = {
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
};

const REDUCTIONS: Record<string, (values: Float32Array) => number> = {
  max: nanMax,
  min: nanMin,
  mean: nanMean,
  median: nanMedian,
};

/** Names of the functions expressions can call */
export const FUNCTIONS = [...Object.keys(ELEMENTWISE), ...Object.keys(REDUCTIONS), 'edges', 'superpixels'];

const pixelsOf = (value: Value, name: string): Float32Array => {
  if (typeof value === 'number') throw new ExpressionError(`${name}() needs an image, not a number`);
  return value;
};

const numberArgument = (value: Value | undefined, name: string, fallback: number) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'number') throw new ExpressionError(`'${name}' must be a number`);
  return value;
};

const call = (expression: Extract<Expression, { type: 'call' }>, raster: Raster): Value => {
  const { name } = expression;
  const args = expression.args.map((arg) => evaluate(arg, raster));
  const kwargs = Object.fromEntries(
    Object.entries(expression.kwargs).map(([key, arg]) => [key, evaluate(arg, raster)])
  );

  if (name in ELEMENTWISE) {
    if (args.length !== 1) throw new ExpressionError(`${name}() takes one argument`);
    return elementwise(args[0], ELEMENTWISE[name]);
  }
  if (name in REDUCTIONS) {
    if (args.length === 2 && (name === 'max' || name === 'min')) {
      // max(a, b) and min(a, b) compare pixel by pixel
      return combine(args[0], args[1], name === 'max' ? Math.max : Math.min);
    }
    if (args.length !== 1) throw new ExpressionError(`${name}() takes one argument`);
    return typeof args[0] === 'number' ? args[0] : REDUCTIONS[name](args[0]);
  }
  if (name === 'edges') {
    if (args.length !== 1) throw new ExpressionError('edges() takes one argument');
    return sobel(pixelsOf(args[0], 'edges'), raster.width, raster.height);
  }
  if (name === 'superpixels') {
    // Same parameters and defaults as skimage.segmentation.felzenszwalb
    const parameters = ['scale', 'sigma', 'min_size'];
    const [image, ...rest] = args;
    if (!image || rest.length > parameters.length) {
      throw new ExpressionError('superpixels() takes an image, scale, sigma and min_size');
    }
    rest.forEach((value, i) => { kwargs[parameters[i]] = value; });
    const unknown = Object.keys(kwargs).filter((key) => !parameters.includes(key));
    if (unknown.length) throw new ExpressionError(`superpixels() has no argument '${unknown[0]}'`);
    const labels = felzenszwalb([pixelsOf(image, 'superpixels')], raster.width, raster.height, {
      scale: numberArgument(kwargs.scale, 'scale', 1),
      sigma: numberArgument(kwargs.sigma, 'sigma', 0.8),
      minSize: numberArgument(kwargs.min_size, 'min_size', 20),
    });
    return Float32Array.from(labels);
  }
  throw new ExpressionError(`Unknown function '${name}', use one of ${FUNCTIONS.join(', ')}`);
};

/** Compute an expression for every pixel of an image */
export const evaluate = (expression: Expression, raster: Raster): Value => {
  switch (expression.type) {
    case 'number':
      return expression.value;
    case 'band':
      return raster.band(expression.file, expression.band);
    case 'name':
      if (expression.name in NAMES) return NAMES[expression.name];
      throw new ExpressionError(`Unknown name '${expression.name}'`);
    case 'unary': {
      const operand = evaluate(expression.operand, raster);
      return expression.op === '-' ? elementwise(operand, (x) => -x) : operand;
    }
    case 'binary':
      return combine(
        evaluate(expression.left, raster),
        evaluate(expression.right, raster),
        BINARY[expression.op]
      );
    case 'call':
      return call(expression, raster);
  }
};

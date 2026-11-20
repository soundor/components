import {
  clamp,
  createScale,
  type Domain,
  type ValueScale,
} from '../internal/scale';

export type Point = readonly [x: number, y: number];

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Insets {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

export interface Axis {
  domain: Domain;
  scale?: ValueScale;
  ticks?: readonly number[] | 'decades';
  minorTicks?: readonly number[] | boolean;
  format?: (value: number) => string;
}

export function viewport(
  width: number,
  height: number,
  insets: Insets = {},
): Rect {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const left = clamp(insets.left ?? 0, 0, w);
  const top = clamp(insets.top ?? 0, 0, h);
  return {
    left,
    top,
    width: Math.max(0, w - left - Math.max(0, insets.right ?? 0)),
    height: Math.max(0, h - top - Math.max(0, insets.bottom ?? 0)),
  };
}

/**
 * Maps the axes' values to pixels. `padding` is a safe zone: the values are
 * mapped into `rect` shrunk by that many pixels, so what sits at the end of an
 * axis, such as a handle, is whole and clear of the axis line. `rect` itself,
 * which clips and holds the grid, stays whole; `inner` is what is mapped.
 */
export function createCoordinates(rect: Rect, x: Axis, y: Axis, padding = 0) {
  const inner = grow(
    rect,
    -Math.min(Math.max(0, padding), rect.width / 2, rect.height / 2),
  );
  return {
    rect,
    inner,
    x: createScale(x.domain, [inner.left, inner.left + inner.width], x.scale),
    y: createScale(y.domain, [inner.top + inner.height, inner.top], y.scale),
  };
}
export type Coordinates = ReturnType<typeof createCoordinates>;

/** Pixels of rounding a marker on an axis's end may be off by. */
export const edgeSlop = 1;

/** A rect widened by `slop` pixels on every side. */
export function grow(rect: Rect, slop: number): Rect {
  return {
    left: rect.left - slop,
    top: rect.top - slop,
    width: rect.width + 2 * slop,
    height: rect.height + 2 * slop,
  };
}

/**
 * Whether a point is in a rect, edges included. `slop` widens the rect by that
 * many pixels each way: a value at the end of an axis maps to its edge, give
 * or take rounding, and must still count as inside.
 */
export function contains(rect: Rect, x: number, y: number, slop = 0) {
  return (
    x >= rect.left - slop &&
    x <= rect.left + rect.width + slop &&
    y >= rect.top - slop &&
    y <= rect.top + rect.height + slop
  );
}

export function clampPoint(rect: Rect, x: number, y: number): Point {
  return [
    clamp(x, rect.left, rect.left + rect.width),
    clamp(y, rect.top, rect.top + rect.height),
  ];
}

/** Returns the closest point within radius or -1. A tie favors the uppermost (last drawn) point. */
export function hitTest(
  points: readonly Point[],
  x: number,
  y: number,
  radius: number,
  clip?: Rect,
) {
  let index = -1;
  let distance = Math.max(0, radius) ** 2;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (clip && !contains(clip, p[0], p[1])) continue;
    const squared = (p[0] - x) ** 2 + (p[1] - y) ** 2;
    if (squared <= distance) {
      distance = squared;
      index = i;
    }
  }
  return index;
}

export function linearTicks(domain: Domain, count = 5): number[] {
  const lo = Math.min(...domain);
  const hi = Math.max(...domain);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(count > 0)) return [];
  if (lo === hi) return [lo];
  const rough = (hi - lo) / Math.min(count, 200);
  if (!Number.isFinite(rough) || rough <= 0) return [];
  const power = 10 ** Math.floor(Math.log10(rough));
  const factor = rough / power;
  const step =
    (factor >= Math.sqrt(50)
      ? 10
      : factor >= Math.sqrt(10)
        ? 5
        : factor >= Math.sqrt(2)
          ? 2
          : 1) * power;
  if (!(step > 0)) return [];
  const first = Math.ceil(lo / step - 1e-12);
  const last = Math.floor(hi / step + 1e-12);
  // Offsets keep the loop bounded even outside the range of safe integer multiples.
  return Array.from({ length: clamp(last - first + 1, 0, 401) }, (_, i) =>
    Number(((first + i) * step).toPrecision(14)),
  );
}

export function logarithmicTicks(domain: Domain) {
  const lo = Math.min(...domain);
  const hi = Math.max(...domain);
  const major: number[] = [];
  const minor: number[] = [];
  if (lo <= 0 || !Number.isFinite(hi)) return { major, minor };
  for (
    let decade = Math.max(-323, Math.floor(Math.log10(lo)));
    decade <= Math.min(308, Math.floor(Math.log10(hi)));
    decade++
  ) {
    const unit = 10 ** decade;
    for (let digit = 1; digit <= 9; digit++) {
      const value = Number((digit * unit).toPrecision(14));
      if (value >= lo && value <= hi) (digit === 1 ? major : minor).push(value);
    }
  }
  return { major, minor };
}

export function axisTicks(axis: Axis, count = 5) {
  const logarithmic =
    axis.scale === 'log' ? logarithmicTicks(axis.domain) : undefined;
  const major =
    axis.ticks === 'decades'
      ? (logarithmic?.major ?? [])
      : (axis.ticks ?? logarithmic?.major ?? linearTicks(axis.domain, count));
  const minor =
    typeof axis.minorTicks === 'object'
      ? axis.minorTicks
      : axis.minorTicks !== false &&
          (axis.minorTicks || axis.ticks === 'decades')
        ? (logarithmic?.minor ?? [])
        : [];
  return { major, minor };
}

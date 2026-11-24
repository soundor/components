import { trueMinus } from '../internal/format';
import type { Domain } from '../internal/scale';
import type { Point } from './geometry';

/** Data samples, either sorted [x, y] points or evenly spaced y values over the x domain. */
export interface PlotSeriesData {
  points?: readonly Point[];
  values?: ArrayLike<number>;
  upper?: readonly Point[];
}

export interface PlotSeries extends PlotSeriesData {
  type?: 'line' | 'area' | 'bars' | 'steps' | 'points' | 'band';
  color?: string;
  label?: string;
  fill?: boolean;
  baseline?: number;
  strokeWidth?: number;
  dash?: readonly number[];
  opacity?: number;
  radius?: number;
  hideInReadout?: boolean;
  /**
   * Carry the first and last values level out to the edges of the plot. A plot
   * with draggable markers keeps a safe zone at the ends of its axes, and a
   * response, such as an EQ curve, should still reach the frame. Leave it off
   * for data that does not continue past its ends, such as a transfer curve
   * or an envelope. For `line`, `area`, `steps` and `band`; default `false`.
   */
  extend?: boolean;
}

/** How `drawMarker` draws a marker: a handle with x and y, a guide line with one. */
export interface PlotMarker {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  dash?: readonly number[];
  radius?: number;
}

/**
 * Live data for one series: a snapshot to read, and a way to hear that a new
 * one is ready. Each notification schedules one canvas draw for the next
 * frame, with no React render; `get()` is read when it draws.
 */
export interface PlotSource<T> {
  get(): T | undefined;
  subscribe(listener: () => void): () => void;
}

/** One series' samples: sorted `[x, y]` points, or `values` spread evenly over the x domain. */
export type PlotSamples =
  | { readonly points: readonly Point[]; readonly values?: never }
  | { readonly values: ArrayLike<number>; readonly points?: never };

/** A band's samples: its lower and upper edges, as sorted `[x, y]` points. */
export interface PlotBandSamples {
  readonly lower: readonly Point[];
  readonly upper: readonly Point[];
}

/** The smallest and largest x and y of some samples; x is absent for `values`. */
export interface SampleExtent {
  x?: readonly [number, number];
  y?: readonly [number, number];
}

function widen(
  range: [number, number] | undefined,
  value: number,
): [number, number] | undefined {
  if (!Number.isFinite(value)) return range;
  if (!range) return [value, value];
  if (value < range[0]) range[0] = value;
  if (value > range[1]) range[1] = value;
  return range;
}

/** The extent of a series' data, for an axis with no domain of its own. */
export function sampleExtent(data: PlotSeriesData): SampleExtent {
  let x: [number, number] | undefined;
  let y: [number, number] | undefined;
  for (const point of [...(data.points ?? []), ...(data.upper ?? [])]) {
    x = widen(x, point[0]);
    y = widen(y, point[1]);
  }
  const values = data.values;
  if (values) for (let i = 0; i < values.length; i++) y = widen(y, values[i]!);
  return { x, y };
}

export function sampleCount(data: PlotSeriesData) {
  return data.points?.length ?? data.values?.length ?? 0;
}

export function sampleX(
  data: PlotSeriesData,
  index: number,
  count: number,
  domain: Domain,
) {
  return (
    data.points?.[index]?.[0] ??
    domain[0] + ((domain[1] - domain[0]) * index) / Math.max(1, count - 1)
  );
}

export function sampleY(data: PlotSeriesData, index: number) {
  return data.points?.[index]?.[1] ?? data.values?.[index] ?? NaN;
}

export function seriesValueAt(
  series: PlotSeries,
  data: PlotSeriesData,
  x: number,
  domain: Domain,
) {
  const count = sampleCount(data);
  if (
    !count ||
    !Number.isFinite(x) ||
    x < sampleX(data, 0, count, domain) ||
    x > sampleX(data, count - 1, count, domain)
  )
    return null;
  let lo = 0;
  let hi = count - 1;
  while (lo < hi) {
    const middle = Math.floor((lo + hi + 1) / 2);
    if (sampleX(data, middle, count, domain) <= x) lo = middle;
    else hi = middle - 1;
  }
  const from = sampleY(data, lo);
  const x0 = sampleX(data, lo, count, domain);
  if (
    lo === count - 1 ||
    series.type === 'steps' ||
    series.type === 'bars' ||
    x === x0
  ) {
    return Number.isFinite(from) ? from : null;
  }
  const to = sampleY(data, lo + 1);
  const x1 = sampleX(data, lo + 1, count, domain);
  const value = from + ((to - from) * (x - x0)) / (x1 - x0);
  return Number.isFinite(value) ? value : null;
}

export const formatTickValue = (value: number) =>
  trueMinus(Number(value.toPrecision(5)));

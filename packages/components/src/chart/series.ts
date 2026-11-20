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

export interface PlotMarker {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  dash?: readonly number[];
  radius?: number;
  /** Setting onMove makes a marker with x and y draggable and keyboard accessible. */
  onMove?: (point: Point) => void;
  onMoveStart?: () => void;
  onMoveEnd?: () => void;
}

export interface PlotSeriesSource {
  get(): readonly PlotSeriesData[] | undefined;
  subscribe(listener: () => void): () => void;
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

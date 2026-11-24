import type { CanvasRenderingContext2D as Context } from 'soundor:ui';

import { clamp, type Domain } from '../internal/scale';
import { contains, edgeSlop, type Coordinates, type Rect } from './geometry';
import {
  sampleCount,
  sampleX,
  sampleY,
  type PlotMarker,
  type PlotSeries,
  type PlotSeriesData,
} from './series';

export function clipToViewport(ctx: Context, rect: Rect, draw: () => void) {
  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.clip();
    draw();
  } finally {
    ctx.restore();
  }
}

function segment(ctx: Context, x1: number, y1: number, x2: number, y2: number) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

export function drawGrid(
  ctx: Context,
  rect: Rect,
  xs: readonly number[],
  ys: readonly number[],
  color: string,
  opacity = 1,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= opacity;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of xs) {
    if (contains(rect, x, rect.top))
      segment(
        ctx,
        Math.floor(x) + 0.5,
        rect.top,
        Math.floor(x) + 0.5,
        rect.top + rect.height,
      );
  }
  for (const y of ys) {
    if (contains(rect, rect.left, y))
      segment(
        ctx,
        rect.left,
        Math.floor(y) + 0.5,
        rect.left + rect.width,
        Math.floor(y) + 0.5,
      );
  }
  ctx.stroke();
  ctx.restore();
}

export interface AxisLabel {
  at: number;
  text: string;
}

export function drawAxes(
  ctx: Context,
  rect: Rect,
  x: readonly AxisLabel[],
  y: readonly AxisLabel[],
  colors: { axis: string; label: string; background: string },
  font: string,
  /** Which axes to draw, lines and labels: both by default. */
  shown: { x?: boolean; y?: boolean } = {},
) {
  const showX = shown.x ?? true;
  const showY = shown.y ?? true;
  if (!showX) x = [];
  if (!showY) y = [];
  const bottom = Math.floor(rect.top + rect.height) + 0.5;
  const left = Math.floor(rect.left) + 0.5;
  const right = rect.left + rect.width;
  ctx.save();
  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (showY) {
    ctx.moveTo(left, rect.top);
    ctx.lineTo(left, bottom);
  }
  if (showX) {
    ctx.moveTo(left, bottom);
    ctx.lineTo(right, bottom);
  }
  for (const tick of x)
    if (contains(rect, tick.at, rect.top))
      segment(ctx, tick.at, bottom, tick.at, bottom + 3);
  for (const tick of y)
    if (contains(rect, rect.left, tick.at))
      segment(ctx, left - 3, tick.at, left, tick.at);
  ctx.stroke();
  ctx.font = font;
  ctx.textBaseline = 'middle';
  for (const tick of x) {
    if (!contains(rect, tick.at, rect.top)) continue;
    const half = ctx.measureText(tick.text).width / 2;
    const at = clamp(
      tick.at,
      rect.left + half,
      Math.max(rect.left + half, right - half),
    );
    axisLabel(
      ctx,
      tick.text,
      at,
      bottom + 10,
      'center',
      colors.label,
      colors.background,
    );
  }
  for (const tick of y)
    if (contains(rect, rect.left, tick.at))
      axisLabel(
        ctx,
        tick.text,
        left - 5,
        tick.at,
        'right',
        colors.label,
        colors.background,
      );
  ctx.restore();
}

function axisLabel(
  ctx: Context,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'center' | 'right',
  color: string,
  background: string,
) {
  const width = ctx.measureText(text).width;
  ctx.fillStyle = background;
  ctx.fillRect(
    x - (align === 'center' ? width / 2 : align === 'right' ? width : 0) - 2,
    y - 5,
    width + 4,
    10,
  );
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Writes one series directly to the canvas. Call within clipToViewport for viewport clipping. */
export function drawSeries(
  ctx: Context,
  space: Coordinates,
  domain: Domain,
  config: PlotSeries,
  data: PlotSeriesData,
  color: string,
  defaultBaseline: number,
) {
  const length = sampleCount(data);
  if (!length) return;
  const type = config.type ?? (config.fill ? 'area' : 'line');
  const { x, y, rect, inner } = space;
  const bottom = rect.top + rect.height;
  const mapped = y.map(config.baseline ?? defaultBaseline);
  // A fill to the end of the axis goes to the edge of the plot, past a safe
  // zone, not to where the zone starts.
  const baseline = !Number.isFinite(mapped)
    ? bottom
    : mapped >= inner.top + inner.height - 0.5
      ? bottom
      : mapped <= inner.top + 0.5
        ? rect.top
        : mapped;
  const radius = Math.max(0, config.radius ?? 2.5);
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = config.strokeWidth ?? 1.5;
  ctx.globalAlpha *= clamp(config.opacity ?? 1);
  if (config.dash) ctx.setLineDash(config.dash);
  if (type === 'band') {
    const upper = data.upper ?? [];
    const valid = (i: number) => {
      const point = upper[i];
      return (
        point &&
        Number.isFinite(x.map(point[0])) &&
        Number.isFinite(y.map(point[1])) &&
        Number.isFinite(x.map(sampleX(data, i, length, domain))) &&
        Number.isFinite(y.map(sampleY(data, i)))
      );
    };
    ctx.globalAlpha *= 0.25;
    for (let i = 0; i < Math.min(length, upper.length);) {
      if (!valid(i)) {
        i++;
        continue;
      }
      const start = i;
      ctx.beginPath();
      ctx.moveTo(
        x.map(sampleX(data, i, length, domain)),
        y.map(sampleY(data, i)),
      );
      for (i++; i < length && valid(i); i++)
        ctx.lineTo(
          x.map(sampleX(data, i, length, domain)),
          y.map(sampleY(data, i)),
        );
      for (let j = i - 1; j >= start; j--)
        ctx.lineTo(x.map(upper[j]![0]), y.map(upper[j]![1]));
      ctx.closePath();
      ctx.fill();
    }
  } else if (type === 'bars' || type === 'points') {
    if (type === 'bars') ctx.globalAlpha *= 0.85;
    ctx.beginPath();
    for (let i = 0; i < length; i++) {
      const px = x.map(sampleX(data, i, length, domain)),
        py = y.map(sampleY(data, i));
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      if (type === 'bars') {
        const previous =
          i > 0
            ? Math.abs(px - x.map(sampleX(data, i - 1, length, domain)))
            : Infinity;
        const next =
          i + 1 < length
            ? Math.abs(x.map(sampleX(data, i + 1, length, domain)) - px)
            : Infinity;
        const gap = Math.min(previous, next);
        const width = Number.isFinite(gap) ? Math.max(1, gap * 0.72) : 2;
        ctx.rect(
          px - width / 2,
          Math.min(py, baseline),
          width,
          Math.abs(py - baseline),
        );
      } else {
        ctx.moveTo(px + radius, py);
        ctx.arc(px, py, radius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  } else {
    const trace = (area: boolean) => {
      let previousY = 0,
        startX = 0,
        previousX = 0,
        started = false;
      const close = () => {
        // A trace that reaches the end of an axis carries on, level, to the
        // edge of the plot: the picture is never short of its frame.
        if (
          config.extend &&
          started &&
          previousX >= inner.left + inner.width - 0.5 &&
          previousX < rect.left + rect.width
        ) {
          ctx.lineTo(rect.left + rect.width, previousY);
          previousX = rect.left + rect.width;
        }
        if (area && started) {
          ctx.lineTo(previousX, baseline);
          ctx.lineTo(startX, baseline);
          ctx.closePath();
        }
        started = false;
      };
      ctx.beginPath();
      for (let i = 0; i < length; i++) {
        const px = x.map(sampleX(data, i, length, domain)),
          py = y.map(sampleY(data, i));
        if (!Number.isFinite(px) || !Number.isFinite(py)) {
          close();
          continue;
        }
        if (!started) {
          const from = config.extend && px <= inner.left + 0.5 ? rect.left : px;
          ctx.moveTo(from, py);
          if (from !== px) ctx.lineTo(px, py);
          startX = from;
          started = true;
        } else {
          if (type === 'steps') ctx.lineTo(px, previousY);
          ctx.lineTo(px, py);
        }
        previousX = px;
        previousY = py;
      }
      close();
    };
    if (type === 'area') {
      trace(true);
      const alpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha * 0.1;
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
    trace(false);
    ctx.stroke();
  }
  ctx.restore();
}

const defaultDash = [2, 3];

export function drawSelection(
  ctx: Context,
  rect: Rect,
  x: number | undefined,
  y: number | undefined,
  color: string,
  dash: readonly number[] = defaultDash,
  opacity = 0.35,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= opacity;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  if (x !== undefined && contains(rect, x, rect.top))
    segment(ctx, x, rect.top, x, rect.top + rect.height);
  if (y !== undefined && contains(rect, rect.left, y))
    segment(ctx, rect.left, y, rect.left + rect.width, y);
  ctx.stroke();
  ctx.restore();
}

export function drawHandle(
  ctx: Context,
  x: number,
  y: number,
  radius: number,
  color: string,
  selected = false,
  halo = radius + 5,
) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * (selected ? 0.2 : 0.08);
  ctx.beginPath();
  ctx.arc(x, y, halo, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * (selected ? 0.8 : 0.35);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMarker(
  ctx: Context,
  space: Coordinates,
  marker: PlotMarker,
  color: string,
  foreground: string,
  font: string,
  selected = false,
) {
  const x = marker.x === undefined ? undefined : space.x.map(marker.x);
  const y = marker.y === undefined ? undefined : space.y.map(marker.y);
  const { rect } = space;
  if (
    (x !== undefined && !contains(rect, x, rect.top, edgeSlop)) ||
    (y !== undefined && !contains(rect, rect.left, y, edgeSlop))
  )
    return;
  const isPoint = x !== undefined && y !== undefined;
  if (isPoint)
    drawHandle(
      ctx,
      x,
      y,
      Math.max(0, marker.radius ?? (marker.label ? 8 : 4)),
      color,
      selected,
    );
  else drawSelection(ctx, rect, x, y, color, marker.dash, 0.8);
  if (!marker.label || (x === undefined && y === undefined)) return;
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign =
    x === undefined ? 'right' : y === undefined ? 'left' : 'center';
  ctx.fillStyle = isPoint ? foreground : color;
  ctx.fillText(
    marker.label,
    x === undefined
      ? rect.left + rect.width - 5
      : x + (y === undefined ? 5 : 0),
    y === undefined
      ? rect.top + rect.height - 9
      : y + (x === undefined ? -7 : 0),
  );
  ctx.restore();
}

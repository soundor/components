import { describe, expect, test, vi } from 'vitest';

import { formatters, parsers } from '../internal/format';
import { createScale, snapValue } from '../internal/scale';
import { clipToViewport, drawAxes, drawSeries } from './drawing';
import {
  axisTicks,
  clampPoint,
  contains,
  edgeSlop,
  createCoordinates,
  hitTest,
  linearTicks,
  logarithmicTicks,
  viewport,
} from './geometry';
import { seriesValueAt } from './series';

describe('scales and ticks', () => {
  test('maps and inverts linear and logarithmic ranges', () => {
    const linear = createScale([-12, 12], [120, 0]);
    const logarithmic = createScale([20, 20000], [0, 300], 'log');
    expect(linear.map(-6)).toBe(90);
    expect(linear.invert(90)).toBe(-6);
    expect(logarithmic.map(200)).toBeCloseTo(100);
    expect(logarithmic.invert(200)).toBeCloseTo(2000);
    expect(logarithmic.map(10)).toBeLessThan(0);
    expect(Number.isNaN(logarithmic.map(-20))).toBe(true);
  });

  test('supports power curves and deterministic degenerate bounds', () => {
    const power = createScale([0, 100], [0, 1], { type: 'power', exponent: 2 });
    const bipolar = createScale([-1, 1], [0, 100], {
      type: 'symmetricPower',
      exponent: 2,
    });
    expect(power.invert(0.5)).toBe(25);
    expect(power.map(25)).toBe(0.5);
    expect(bipolar.map(0)).toBe(50);
    expect(bipolar.invert(25)).toBe(-0.25);
    expect(createScale([4, 4], [7, 9]).invert(9)).toBe(4);
    expect(createScale([1, 10], [5, 5]).map(3)).toBe(5);
    expect(createScale([0, 10], [0, 10], 'log').map(5)).toBe(5);
  });

  test('snaps anchored to the lower limit while preserving endpoints', () => {
    expect(snapValue(0.27, -0.2, 0.7, 0.1)).toBe(0.3);
    expect(snapValue(0.7, -0.2, 0.7, 0.2)).toBe(0.7);
    expect(snapValue(-2, -0.2, 0.7)).toBe(-0.2);
  });

  test('generates stable linear and decade ticks and accepts explicit override lists', () => {
    expect(linearTicks([-0.3, 0.3], 6)).toEqual([
      -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3,
    ]);
    expect(linearTicks([2, 2])).toEqual([2]);
    expect(linearTicks([Infinity, 12])).toEqual([]);
    const ticks = logarithmicTicks([20, 250]);
    expect(ticks.major).toEqual([100]);
    expect(ticks.minor).toEqual([20, 30, 40, 50, 60, 70, 80, 90, 200]);
    expect(logarithmicTicks([0, 200])).toEqual({ major: [], minor: [] });
    expect(
      axisTicks({
        domain: [20, 250],
        scale: 'log',
        ticks: [25, 200],
        minorTicks: [50],
      }),
    ).toEqual({ major: [25, 200], minor: [50] });
    expect(
      axisTicks({ domain: [20, 250], scale: 'log', ticks: 'decades' }),
    ).toEqual(ticks);
  });

  test('formats and parses engineering values', () => {
    expect(formatters.frequency(1250)).toBe('1.25 kHz');
    expect(formatters.decibels(-6)).toBe('−6.0 dB');
    expect(formatters.time(1500)).toBe('1.50 s');
    expect(parsers.number('2.5k')).toBe(2500);
    expect(parsers.number('35%')).toBe(0.35);
    expect(parsers.number('250 frogs')).toBeNull();
    expect(formatters.pan(0)).toBe('C');
    expect(parsers.pan('L 20')).toBe(-0.2);
  });
});

describe('viewport', () => {
  test('transforms coordinates consistently after a resize and inverts Y', () => {
    const x = { domain: [0, 1] } as const;
    const y = { domain: [-1, 1] } as const;
    const insets = { left: 30, right: 10, top: 15, bottom: 20 };
    const small = createCoordinates(viewport(200, 100, insets), x, y);
    const large = createCoordinates(viewport(400, 200, insets), x, y);
    expect(small.x.map(0.5)).toBe(110);
    expect(large.x.map(0.5)).toBe(210);
    expect(large.y.map(1)).toBe(15);
    expect(large.y.map(-1)).toBe(180);
    expect(large.y.invert(large.y.map(0.4))).toBeCloseTo(0.4);
    expect(viewport(9, 5, insets)).toEqual({
      left: 9,
      top: 5,
      width: 0,
      height: 0,
    });
  });

  test('tests hit radius, stacking and clipping bounds', () => {
    const rect = viewport(40, 30, { left: 10, top: 10 });
    const points = [
      [9, 11],
      [13, 12],
      [13, 12],
    ] as const;
    expect(hitTest(points, 10, 11, 5)).toBe(0);
    expect(hitTest(points, 10, 11, 5, rect)).toBe(2);
    expect(hitTest(points, 30, 12, 3, rect)).toBe(-1);
    expect(contains(rect, 40, 30)).toBe(true);
    // A value at the end of an axis maps to the edge, give or take rounding.
    expect(contains(rect, 10, 30 + 1e-9)).toBe(false);
    expect(contains(rect, 10, 30 + 1e-9, edgeSlop)).toBe(true);
    expect(contains(rect, 10, 30 + 3, edgeSlop)).toBe(false);
    expect(clampPoint(rect, 0, 60)).toEqual([10, 30]);
  });

  test('a safe zone maps values inside the rect and leaves the rect whole', () => {
    const rect = { left: 10, top: 20, width: 100, height: 60 };
    const axes = [
      { domain: [0, 10] as const },
      { domain: [0, 1] as const },
    ] as const;
    const flush = createCoordinates(rect, ...axes);
    expect([flush.x.map(0), flush.x.map(10)]).toEqual([10, 110]);
    const safe = createCoordinates(rect, ...axes, 8);
    expect(safe.rect).toEqual(rect);
    expect([safe.x.map(0), safe.x.map(10)]).toEqual([18, 102]);
    expect([safe.y.map(0), safe.y.map(1)]).toEqual([72, 28]);
    // Too big a zone cannot turn the rect inside out.
    const huge = createCoordinates(rect, ...axes, 999).inner;
    expect(huge.height).toBe(0);
    expect(huge.width).toBeGreaterThanOrEqual(0);
  });

  test('restores Canvas clipping even when the drawing callback throws', () => {
    const calls: string[] = [];
    const mock = {
      save: () => calls.push('save'),
      beginPath: () => calls.push('path'),
      rect: (...values: number[]) => calls.push(values.join(',')),
      clip: () => calls.push('clip'),
      restore: () => calls.push('restore'),
    };
    expect(() =>
      clipToViewport(
        mock as unknown as CanvasRenderingContext2D,
        viewport(40, 30, { left: 5, top: 3 }),
        () => {
          calls.push('draw');
          throw new Error('draw failed');
        },
      ),
    ).toThrow('draw failed');
    expect(calls).toEqual([
      'save',
      'path',
      '5,3,35,27',
      'clip',
      'draw',
      'restore',
    ]);
  });
});

test('sample lookups support typed data, step series and discontinuous input', () => {
  const data = { values: new Float32Array([0, 4, 8]) };
  expect(seriesValueAt({}, data, 2.5, [0, 10])).toBe(2);
  expect(seriesValueAt({ type: 'steps' }, data, 2.5, [0, 10])).toBe(0);
  expect(seriesValueAt({}, data, 12, [0, 10])).toBeNull();
  expect(seriesValueAt({}, { values: [0, NaN, 8] }, 2.5, [0, 10])).toBeNull();
});

test('trace drawing breaks at missing values and never passes NaN to Canvas', () => {
  const ctx = {
    save: vi.fn<() => void>(),
    restore: vi.fn<() => void>(),
    beginPath: vi.fn<() => void>(),
    setLineDash: vi.fn<CanvasRenderingContext2D['setLineDash']>(),
    moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
    lineTo: vi.fn<CanvasRenderingContext2D['lineTo']>(),
    stroke: vi.fn<() => void>(),
    globalAlpha: 1,
  };
  const axis = { domain: [0, 4] } as const;
  const space = createCoordinates(viewport(40, 40), axis, axis);
  drawSeries(
    ctx as unknown as CanvasRenderingContext2D,
    space,
    axis.domain,
    {},
    { values: [0, 1, NaN, 3, 4] },
    '#fff',
    0,
  );
  expect(ctx.moveTo.mock.calls).toEqual([
    [0, 40],
    [30, 10],
  ]);
  expect(ctx.lineTo.mock.calls).toEqual([
    [10, 30],
    [40, 0],
  ]);
  expect(ctx.stroke).toHaveBeenCalledTimes(1);
});

test('a trace asked to extend runs on, level, to the plot edges past a safe zone', () => {
  const ctx = {
    save: vi.fn<() => void>(),
    restore: vi.fn<() => void>(),
    beginPath: vi.fn<() => void>(),
    setLineDash: vi.fn<CanvasRenderingContext2D['setLineDash']>(),
    moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
    lineTo: vi.fn<CanvasRenderingContext2D['lineTo']>(),
    stroke: vi.fn<() => void>(),
    globalAlpha: 1,
  };
  const axis = { domain: [0, 4] } as const;
  // A 10-pixel safe zone: values map to 10..90 of a 100-wide plot.
  const space = createCoordinates(viewport(100, 100), axis, axis, 10);
  drawSeries(
    ctx as unknown as CanvasRenderingContext2D,
    space,
    axis.domain,
    { extend: true },
    { values: [0, 2, 4] },
    '#fff',
    0,
  );
  // From the left edge to the first value, then on to the right edge.
  expect(ctx.moveTo.mock.calls).toEqual([[0, 90]]);
  expect(ctx.lineTo.mock.calls).toEqual([
    [10, 90],
    [50, 50],
    [90, 10],
    [100, 10],
  ]);
  // Not unless asked: the data ends where it ends.
  ctx.moveTo.mockClear();
  ctx.lineTo.mockClear();
  drawSeries(
    ctx as unknown as CanvasRenderingContext2D,
    space,
    axis.domain,
    {},
    { values: [0, 2, 4] },
    '#fff',
    0,
  );
  expect(ctx.moveTo.mock.calls).toEqual([[10, 90]]);
  expect(ctx.lineTo.mock.calls).toEqual([
    [50, 50],
    [90, 10],
  ]);
});

test('an axis label gap sets the labels further off, and the ticks reach towards them', () => {
  function draw(labelGap?: number) {
    const ctx = {
      save: vi.fn<() => void>(),
      restore: vi.fn<() => void>(),
      beginPath: vi.fn<() => void>(),
      moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
      lineTo: vi.fn<CanvasRenderingContext2D['lineTo']>(),
      stroke: vi.fn<() => void>(),
      fillRect: vi.fn<CanvasRenderingContext2D['fillRect']>(),
      fillText: vi.fn<CanvasRenderingContext2D['fillText']>(),
      measureText: () => ({ width: 10 }),
    };
    const rect = { left: 20, top: 0, width: 80, height: 40 };
    drawAxes(
      ctx as unknown as CanvasRenderingContext2D,
      rect,
      [{ at: 50, text: '1k' }],
      [{ at: 20, text: '0' }],
      { axis: '#000', label: '#fff', background: '#000' },
      '10px sans-serif',
      {},
      'bottom',
      0,
      labelGap,
    );
    return ctx;
  }
  const plain = draw();
  // The x tick, then the y tick, after the two axis lines.
  expect(plain.lineTo.mock.calls.slice(2)).toEqual([
    [50, 43.5],
    [17.5, 20],
  ]);
  expect(plain.fillText.mock.calls).toEqual([
    ['1k', 50, 50.5],
    ['0', 15.5, 20],
  ]);
  const gap = draw(14);
  expect(gap.lineTo.mock.calls.slice(2)).toEqual([
    [50, 55.5],
    [5.5, 20],
  ]);
  expect(gap.fillText.mock.calls).toEqual([
    ['1k', 50, 64.5],
    ['0', 1.5, 20],
  ]);
});

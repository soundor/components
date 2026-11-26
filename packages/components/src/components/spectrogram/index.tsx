import { Canvas, View } from '@soundor/react';
import { useLayoutEffect, useMemo, useRef } from 'react';

import type { PlotSource } from '../../chart/series';
import { clamp, type Domain } from '../../internal/scale';
import { useComponent, type StyleProps } from '../../theme';
import { fillBox, useCanvasBox, useDrawing } from '../shared/display';
import { createHistory, type SpectrumFrame } from './history';

export type { SpectrumFrame } from './history';

export interface SpectrogramProps extends StyleProps<'Spectrogram'> {
  width: number;
  height: number;
  source: PlotSource<SpectrumFrame>;
  frequencyRange?: Domain;
  frequencyScale?: 'linear' | 'log';
  amplitudeRange?: Domain;
  /** Number of columns or rows in the sweep (1–1024). */
  historyLength?: number;
  /** Number of displayed frequency samples (2–512). */
  bins?: number;
  /** Direction of time, with the oldest data overwritten on wrap. */
  orientation?: 'horizontal' | 'vertical';
  /** Called on a fixed palette of normalized values, not per pixel. */
  colorMap?: (fraction: number) => string;
  /** Change this key to clear accumulated frames. */
  resetKey?: string | number;
  accessibilityLabel?: string;
}

/** A bounded, incremental display of precomputed spectrum frames. */
export function Spectrogram({
  width,
  height,
  source,
  frequencyRange = [20, 20000],
  frequencyScale = 'log',
  amplitudeRange = [-90, 0],
  historyLength = 192,
  bins = 96,
  orientation = 'horizontal',
  colorMap,
  resetKey,
  accessibilityLabel = 'Spectrogram',
  ...styles
}: SpectrogramProps) {
  const { theme, slot } = useComponent('Spectrogram', styles);
  const box = useCanvasBox(width, height);
  const [low, high] = frequencyRange;
  const [floor, ceiling] = amplitudeRange;
  const capacity = clamp(Math.floor(historyLength) || 1, 1, 1024);
  const resolution = clamp(Math.floor(bins) || 2, 2, 512);
  const history = useMemo(
    () => createHistory(capacity, resolution, [low, high], frequencyScale),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- source and resetKey identify a new sweep
    [capacity, resolution, low, high, frequencyScale, source, resetKey],
  );
  const palette = useMemo(
    () =>
      Array.from(
        { length: 128 },
        (_, i) => colorMap?.(i / 127) ?? theme.color.lime,
      ),
    [colorMap, theme.color.lime],
  );
  const redraw = useRef(true);
  const cursor = useRef<number | null>(null);
  useLayoutEffect(() => {
    redraw.current = true;
  });
  const invalidate = useDrawing(
    box,
    (ctx) => {
      const { width: w, height: h } = box;
      const horizontal = orientation === 'horizontal';
      const full = redraw.current;
      if (full) {
        ctx.clearRect(0, 0, w, h);
        cursor.current = null;
      }
      // Paint in device pixels so adjacent cells have no fractional seams.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const timePixels = horizontal ? box.canvas.width : box.canvas.height;
      const frequencyPixels = horizontal ? box.canvas.height : box.canvas.width;
      const cell = (slot: number, bin: number, count = 1) => {
        const a = Math.round((slot * timePixels) / capacity);
        const b = Math.round(((slot + 1) * timePixels) / capacity);
        const c = Math.round((bin * frequencyPixels) / resolution);
        const d = Math.round(((bin + count) * frequencyPixels) / resolution);
        if (horizontal) ctx.fillRect(a, frequencyPixels - d, b - a, d - c);
        else ctx.fillRect(c, a, d - c, b - a);
      };
      const draw = (slot: number) => {
        ctx.globalAlpha = 1;
        ctx.fillStyle = theme.color.display;
        cell(slot, 0, resolution);
        for (let i = 0; i < resolution; i++) {
          const value = history.values[slot * resolution + i]!;
          const n =
            ceiling > floor && Number.isFinite(value)
              ? clamp((value - floor) / (ceiling - floor))
              : 0;
          if (!n && !colorMap) continue;
          ctx.fillStyle = palette[Math.round(n * 127)]!;
          ctx.globalAlpha = colorMap ? 1 : n;
          cell(slot, i);
        }
      };
      const count = full ? history.size : history.pending;
      if (!count) return;
      if (cursor.current !== null && history.size === capacity)
        draw(cursor.current);
      for (let i = count; i > 0; i--)
        draw((history.next + capacity - i) % capacity);
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.color.displayAxis;
      cell(history.next, 0, resolution);
      cursor.current = history.next;
      redraw.current = false;
      history.markDrawn();
    },
    false,
  );
  useLayoutEffect(() => {
    const append = () => {
      const frame = source.get();
      if (!frame) return;
      history.push(frame);
      invalidate();
    };
    const unsubscribe = source.subscribe(append);
    append();
    return unsubscribe;
  }, [source, history, invalidate]);
  return (
    <View
      style={slot('root', {
        width,
        height,
        overflow: 'hidden',
        borderRadius: theme.radius.radiusLg,
        backgroundColor: theme.color.display,
      })}
    >
      <Canvas
        ref={box.node}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={slot('canvas', { ...fillBox, pointerEvents: 'none' })}
      />
    </View>
  );
}

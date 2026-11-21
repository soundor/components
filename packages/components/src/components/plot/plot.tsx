import { Canvas, Text, View } from '@soundor/react';
import { useMemo, useRef, type ReactNode } from 'react';

import {
  clipToViewport,
  drawAxes,
  drawGrid,
  drawMarker,
  drawSelection,
  drawSeries,
} from '../../chart/drawing';
import {
  axisTicks,
  contains,
  edgeSlop,
  grow,
  createCoordinates,
  hitTest,
  viewport,
  type Axis,
  type Coordinates,
  type Point,
} from '../../chart/geometry';
import {
  formatTickValue,
  seriesValueAt,
  type PlotMarker,
  type PlotSeries,
  type PlotSeriesData,
  type PlotSeriesSource,
} from '../../chart/series';
import { useXYPad } from '../../headless';
import {
  textStyle,
  useComponent,
  type StyleProps,
  type Theme,
} from '../../theme';
import type { DisplayCaption } from '../shared/display';
import { DisplayHeader } from '../shared/display';
import { useCanvasBox } from '../shared/display';
import { useDrawing } from '../shared/display';
import { fillBox } from '../shared/display';
import { fallbacks } from '../shared/display';
import { voices } from '../shared/display';
import { colorFor } from '../shared/display';
import { numericFont } from '../shared/display';
import { position } from '../shared/display';

export type PlotAxis = Axis;

export interface PlotProps extends DisplayCaption, StyleProps<'Plot'> {
  width: number;
  height: number;
  series: readonly PlotSeries[];
  /** Live samples by series index. A notification schedules a Canvas redraw without a React render. */
  seriesSource?: PlotSeriesSource;
  x?: PlotAxis;
  y?: PlotAxis;
  markers?: readonly PlotMarker[];
  legend?: boolean;
  readout?: boolean;
  /**
   * Views of your own over the plot, such as handles, laid out in its
   * coordinates: `space.x.map(value)` is where a value is across, and
   * `space.inner` the area the axes map to. Drawn above the canvas and the
   * markers, below the title and legend.
   */
  overlay?: (space: Coordinates) => ReactNode;
  /**
   * Pixels the axes are mapped inside the plot area, so that a handle of
   * your own at the end of an axis is whole. Draggable markers keep one of
   * their own; the larger is used.
   */
  safeZone?: number;
  accessibilityLabel?: string;
  debugId?: string;
}

interface HandleProps {
  marker: PlotMarker & { x: number; y: number };
  coordinates: Coordinates;
  x: Axis;
  y: Axis;
  label: string;
  onFocus: (focused: boolean) => void;
}

function MarkerControl({
  marker,
  coordinates,
  x,
  y,
  label,
  onFocus,
}: HandleProps) {
  const control = useXYPad(
    {
      value: marker.x,
      defaultValue: marker.x,
      min: x.domain[0],
      max: x.domain[1],
      scale: x.scale,
      format: x.format,
    },
    {
      value: marker.y,
      defaultValue: marker.y,
      min: y.domain[0],
      max: y.domain[1],
      scale: y.scale,
      format: y.format,
    },
    {
      label,
      dragMode: 'relative',
      travel: [coordinates.inner.width, coordinates.inner.height],
      onPointChange: (currentX, currentY) =>
        marker.onMove?.([currentX, currentY]),
      onInteractionStart: marker.onMoveStart,
      onInteractionEnd: marker.onMoveEnd,
    },
  );
  const atX = coordinates.x.map(marker.x);
  const atY = coordinates.y.map(marker.y);
  const radius = Math.max(12, (marker.radius ?? 8) + 5);
  return (
    <View
      {...control.handlers}
      onFocusVisibleChange={(event) => onFocus(event.focusVisible)}
      onBlur={(event) => {
        control.handlers.onBlur?.(event);
        onFocus(false);
      }}
      style={{
        position: 'absolute',
        left: atX - radius,
        top: atY - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        cursor: 'crosshair',
      }}
    />
  );
}

export function Plot({
  width,
  height,
  series,
  seriesSource,
  x = fallbacks.x,
  y = fallbacks.y,
  markers = [],
  legend,
  readout,
  overlay,
  safeZone: ownSafeZone = 0,
  title,
  note,
  indicator,
  accessibilityLabel,
  debugId,
  ...styles
}: PlotProps) {
  const { theme, slot, fontsReady } = useComponent('Plot', styles);
  const c = theme.color;
  const box = useCanvasBox(width, height);
  const { node, width: logicalWidth, height: logicalHeight } = box;
  const header = Boolean(title || note || indicator || legend);
  // A plot with handles keeps them whole at the ends of its axes: its values
  // map inside the plot area, short of its edge by a handle's radius and a bit.
  const safeZone = Math.max(
    0,
    ownSafeZone,
    ...markers
      .filter(
        (marker) =>
          marker.onMove && marker.x !== undefined && marker.y !== undefined,
      )
      // A handle's radius and its halo, which is 5 pixels more.
      .map((marker) => (marker.radius ?? (marker.label ? 8 : 4)) + 5),
  );
  const geometry = useMemo(() => {
    const coordinates = createCoordinates(
      viewport(logicalWidth, logicalHeight, {
        left: Math.min(56, logicalWidth * 0.24),
        right: 14,
        top: header
          ? Math.max(legend && (title || note) ? 48 : 28, logicalHeight * 0.2)
          : 10,
        bottom: 20,
      }),
      x,
      y,
      safeZone,
    );
    const xt = axisTicks(
      x,
      Math.max(2, Math.floor(coordinates.rect.width / 75)),
    );
    const yt = axisTicks(
      y,
      Math.max(2, Math.floor(coordinates.rect.height / 36)),
    );
    return {
      coordinates,
      majorX: xt.major.map(coordinates.x.map),
      majorY: yt.major.map(coordinates.y.map),
      minorX: xt.minor.map(coordinates.x.map),
      minorY: yt.minor.map(coordinates.y.map),
      xLabels: xt.major.map((value) => ({
        at: coordinates.x.map(value),
        text: (x.format ?? formatTickValue)(value),
      })),
      yLabels: yt.major.map((value) => ({
        at: coordinates.y.map(value),
        text: (y.format ?? formatTickValue)(value),
      })),
    };
  }, [
    logicalWidth,
    logicalHeight,
    header,
    legend,
    title,
    note,
    x,
    y,
    safeZone,
  ]);
  const { coordinates, xLabels, yLabels } = geometry;
  const markerPoints = useMemo(
    () =>
      markers.map((marker): Point => [
        coordinates.x.map(marker.x ?? NaN),
        coordinates.y.map(marker.y ?? NaN),
      ]),
    [markers, coordinates],
  );
  const colors = useMemo(
    () =>
      series.map((entry, index) =>
        colorFor(theme, entry.color ?? voices[index % voices.length]!),
      ),
    [series, theme],
  );
  const pointer = useRef<Point | null>(null);
  const keyboardMarker = useRef(-1);
  const invalidate = useDrawing(
    box,
    (ctx) => {
      const { rect } = coordinates;
      if (!rect.width || !rect.height) return;
      const source = seriesSource?.get();
      const hovered = pointer.current;
      const selected = hovered
        ? hitTest(
            markerPoints,
            hovered[0],
            hovered[1],
            14,
            grow(rect, edgeSlop),
          )
        : -1;
      const font = numericFont(theme, fontsReady, 9);
      clipToViewport(ctx, rect, () => {
        drawGrid(
          ctx,
          rect,
          geometry.minorX,
          geometry.minorY,
          c.displayGrid,
          0.45,
        );
        drawGrid(ctx, rect, geometry.majorX, geometry.majorY, c.displayGrid);
        for (let i = 0; i < series.length; i++) {
          const entry = series[i]!;
          drawSeries(
            ctx,
            coordinates,
            x.domain,
            entry,
            source?.[i] ?? entry,
            colors[i]!,
            y.domain[0],
          );
        }
        if (readout && hovered && contains(rect, hovered[0], hovered[1])) {
          drawSelection(ctx, rect, hovered[0], hovered[1], c.displayText);
        }
      });
      // Not clipped, so a handle at the end of an axis is whole.
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i]!;
        drawMarker(
          ctx,
          coordinates,
          marker,
          colorFor(theme, marker.color ?? c.displayMuted),
          c.display,
          numericFont(theme, fontsReady, 10, true),
          selected === i || keyboardMarker.current === i,
        );
      }
      drawAxes(
        ctx,
        rect,
        xLabels,
        yLabels,
        { axis: c.displayAxis, label: c.displayMuted, background: c.display },
        font,
      );
      if (readout && hovered && contains(rect, hovered[0], hovered[1])) {
        paintReadout(
          ctx,
          hovered,
          coordinates,
          x,
          y,
          series,
          source,
          colors,
          theme,
          fontsReady,
          box.width,
        );
      }
    },
    seriesSource,
  );
  const interactive = markers.some((marker) => marker.onMove);
  const canHover = readout || interactive;
  return (
    <View
      debugId={debugId}
      style={slot('root', {
        width,
        height,
        overflow: 'hidden',
        backgroundColor: c.display,
        borderRadius: theme.radius.radiusXl,
        cursor: readout ? 'crosshair' : undefined,
      })}
      onPointerMove={
        canHover
          ? (event) => {
              pointer.current = position(event);
              invalidate();
            }
          : undefined
      }
      onPointerLeave={
        canHover
          ? () => {
              pointer.current = null;
              invalidate();
            }
          : undefined
      }
    >
      <Canvas
        ref={node}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? title ?? 'Plot'}
        style={slot('canvas', { ...fillBox, pointerEvents: 'none' })}
      />
      {markers.map((marker, index) => {
        const point = markerPoints[index]!;
        if (
          marker.x === undefined ||
          marker.y === undefined ||
          !marker.onMove ||
          !contains(coordinates.rect, point[0], point[1], edgeSlop)
        )
          return null;
        return (
          <MarkerControl
            key={index}
            marker={{ ...marker, x: marker.x, y: marker.y }}
            coordinates={coordinates}
            x={x}
            y={y}
            label={marker.label ?? `Point ${index + 1}`}
            onFocus={(focused) => {
              keyboardMarker.current = focused ? index : -1;
              invalidate();
            }}
          />
        );
      })}
      {overlay?.(coordinates)}
      {legend && (
        <View
          style={{
            position: 'absolute',
            right: 18,
            top: title || note ? 32 : 12,
            flexDirection: 'row',
            gap: theme.spacing.spaceLg,
            pointerEvents: 'none',
          }}
        >
          {series.map(
            (entry, index) =>
              entry.label && (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.spaceSm,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height:
                        entry.type === 'bars' || entry.type === 'band' ? 6 : 2,
                      borderRadius: 1,
                      backgroundColor: colors[index],
                    }}
                  />
                  <Text
                    style={[
                      textStyle(theme, 'section', c.displayText),
                      { letterSpacing: 0.8 },
                    ]}
                  >
                    {entry.label.toUpperCase()}
                  </Text>
                </View>
              ),
          )}
        </View>
      )}
      <DisplayHeader
        title={title}
        note={note}
        indicator={indicator}
        theme={theme}
        titleStyle={slot('title')}
        noteStyle={slot('note')}
      />
    </View>
  );
}

function paintReadout(
  ctx: CanvasRenderingContext2D,
  pointer: Point,
  coordinates: Coordinates,
  x: Axis,
  y: Axis,
  series: readonly PlotSeries[],
  source: readonly PlotSeriesData[] | undefined,
  colors: readonly string[],
  theme: Theme,
  ready: boolean,
  width: number,
) {
  const xValue = coordinates.x.invert(pointer[0]);
  const xLabel = (x.format ?? formatTickValue)(xValue);
  const yFormat = y.format ?? formatTickValue;
  ctx.save();
  ctx.font = numericFont(theme, ready, 10);
  ctx.textBaseline = 'middle';
  let textWidth = ctx.measureText(xLabel).width;
  const labels: { text: string; color: string }[] = [];
  for (let i = 0; i < series.length; i++) {
    const entry = series[i]!;
    if (!entry.label || entry.hideInReadout) continue;
    const value = seriesValueAt(entry, source?.[i] ?? entry, xValue, x.domain);
    if (value === null) continue;
    const color = colors[i]!;
    const text = `${entry.label}  ${yFormat(value)}`;
    const at = coordinates.y.map(value);
    if (contains(coordinates.rect, pointer[0], at)) {
      ctx.beginPath();
      ctx.arc(pointer[0], at, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
    textWidth = Math.max(textWidth, ctx.measureText(text).width);
    labels.push({ text, color });
  }
  const panelWidth = textWidth + 16;
  const left = Math.max(
    0,
    Math.min(
      width - panelWidth,
      pointer[0] +
        (pointer[0] + panelWidth + 10 > width ? -panelWidth - 10 : 10),
    ),
  );
  // Inside the plot, under the header: the title and the legend are views
  // above the canvas, and would cover a panel up there.
  const top = coordinates.rect.top + 6;
  ctx.fillStyle = theme.color.display;
  ctx.strokeStyle = theme.color.displayGrid;
  ctx.fillRect(left, top, panelWidth, (labels.length + 1) * 12 + 8);
  ctx.strokeRect(left, top, panelWidth, (labels.length + 1) * 12 + 8);
  ctx.fillStyle = theme.color.displayMuted;
  ctx.fillText(xLabel, left + 8, top + 10);
  for (let i = 0; i < labels.length; i++) {
    const line = labels[i]!;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, left + 8, top + 22 + i * 12);
  }
  ctx.restore();
}

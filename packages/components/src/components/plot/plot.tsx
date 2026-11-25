import { Canvas, View } from '@soundor/react';
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { UiNode } from 'soundor:ui';

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
  createCoordinates,
  edgeSlop,
  grow,
  hitTest,
  viewport,
  type Axis,
  type Coordinates,
  type Point,
} from '../../chart/geometry';
import {
  formatTickValue,
  seriesValueAt,
  type PlotSeries,
  type PlotSeriesData,
} from '../../chart/series';
import type { Domain } from '../../internal/scale';
import { useComponent, type StyleProps, type Theme } from '../../theme';
import {
  DisplayHeader,
  colorFor,
  fillBox,
  numericFont,
  position,
  useCanvasBox,
  useDrawing,
  voices,
  type DisplayCaption,
} from '../shared/display';
import { PlotBackground, type PlotBackgroundProps } from './background';
import {
  ControllerContext,
  PlotController,
  SpaceContext,
  type SeriesLayer,
  type PlotAxisReference,
  type AxisSide,
} from './controller';

export type PlotAxis = Axis;

export interface PlotProps
  extends DisplayCaption, StyleProps<'Plot'>, PlotBackgroundProps {
  width: number;
  height: number;
  /**
   * What it shows: axes, a grid, series, markers, a legend and a readout
   * (`Plot.XAxis`, `Plot.Line`, `Plot.Marker`…), and components of yours
   * that render them, in any order. Series are drawn in the order they are
   * in the tree, the first at the bottom; markers and guide lines over
   * every series. Views of your own are laid over the canvas, in the plot's
   * coordinates with `usePlotCoordinates()`.
   */
  children?: ReactNode;
  /**
   * Pixels the axes are mapped inside the plot area, so that a handle of
   * your own at the end of an axis is whole. Draggable markers keep one of
   * their own; the larger is used.
   */
  safeZone?: number;
  accessibilityLabel?: string;
  debugId?: string;
}

/** An axis with no `Plot.XAxis` or `Plot.YAxis`: the extent of the static data. */
function fallbackDomain(
  series: Iterable<SeriesLayer>,
  name: 'x' | 'y',
): Domain {
  let lo = Infinity;
  let hi = -Infinity;
  for (const layer of series) {
    const range = layer.extent?.[name];
    if (layer[name === 'x' ? 'xAxis' : 'yAxis'] !== undefined) continue;
    if (!range) continue;
    lo = Math.min(lo, range[0]);
    hi = Math.max(hi, range[1]);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
  if (lo === hi) return [lo - 1, hi + 1];
  return [lo, hi];
}

/** A series' colour: its own, or the theme's voices in turn. */
export function seriesColor(theme: Theme, config: PlotSeries, index: number) {
  return colorFor(theme, config.color ?? voices[index % voices.length]!);
}

/**
 * A canvas chart for responses and measurements, built from its parts:
 *
 *   <Plot width={440} height={220}>
 *     <Plot.XAxis domain={[20, 20_000]} scale="log" format={formatters.frequency} />
 *     <Plot.YAxis domain={[-24, 24]} format={formatters.decibels} />
 *     <Plot.Grid />
 *     <Plot.Area source={spectrum} opacity={0.4} />
 *     <Plot.Line points={response} />
 *     <Plot.Marker x={band.hz} y={band.db} onMove={moveBand} />
 *     <Plot.Readout />
 *   </Plot>
 *
 * Every series, guide and marker is drawn on one canvas, once per frame at
 * most: a live source's update draws, with no React render.
 */
export function PlotRoot({
  width,
  height,
  children,
  safeZone: ownSafeZone = 0,
  title,
  note,
  indicator,
  accessibilityLabel,
  debugId,
  onBackgroundPress,
  onBackgroundDoubleClick,
  onBackgroundPointerMove,
  onBackgroundPointerEnter,
  onBackgroundPointerLeave,
  onBackgroundContextMenu,
  onBackgroundDrag,
  ...styles
}: PlotProps) {
  const { theme, slot, fontsReady } = useComponent('Plot', styles);
  const c = theme.color;
  const [controller] = useState(() => new PlotController());
  const version = useSyncExternalStore(
    controller.subscribe,
    controller.getVersion,
    controller.getVersion,
  );
  // A render of the Plot's: what is under it may have moved.
  controller.reorder();
  const declaredX = controller.axis('x');
  const declaredY = controller.axis('y');
  const legend = controller.has('legend');
  const readout = controller.has('readout');
  const draggable = controller.safeZone();
  // `version` stands for what the controller holds: these change with it.
  const x = useMemo(
    () => declaredX ?? { domain: fallbackDomain(controller.series, 'x') },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [declaredX, controller, version],
  );
  const y = useMemo(
    () => declaredY ?? { domain: fallbackDomain(controller.series, 'y') },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [declaredY, controller, version],
  );
  const box = useCanvasBox(width, height);
  const { node, width: logicalWidth, height: logicalHeight } = box;
  const header = Boolean(title || note || indicator || legend);
  // A plot with handles keeps them whole at the ends of its axes: its values
  // map inside the plot area, short of its edge by a handle's radius and a bit.
  const safeZone = Math.max(0, ownSafeZone, draggable);
  const geometry = useMemo(() => {
    const entries = [
      ...controller.namedAxes('x').map(([, axis]) => ({
        name: 'x' as const,
        axis,
      })),
      ...controller.namedAxes('y').map(([, axis]) => ({
        name: 'y' as const,
        axis,
      })),
    ];
    const lanes: Record<AxisSide, number> = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    const yRoom = Math.min(56, logicalWidth * 0.24);
    const captionRoom = header
      ? Math.max(legend && (title || note) ? 48 : 28, logicalHeight * 0.2)
      : 0;
    const visible = entries
      .filter(({ axis }) => !axis.hidden)
      .map((entry) => {
        const offset = lanes[entry.axis.side];
        lanes[entry.axis.side] += entry.name === 'x' ? 20 : yRoom;
        return { ...entry, offset };
      });
    const coordinates = createCoordinates(
      viewport(logicalWidth, logicalHeight, {
        left: lanes.left || 14,
        right: lanes.right || 14,
        top: captionRoom + lanes.top || 10,
        bottom: lanes.bottom || 10,
      }),
      x,
      y,
      safeZone,
    );
    const primary = { coordinates, x, y };
    const maps = {
      x: new Map<Axis, Coordinates['x']>(),
      y: new Map<Axis, Coordinates['y']>(),
    };
    maps.x.set(x, coordinates.x);
    maps.y.set(y, coordinates.y);
    for (const { name, axis } of entries) {
      if (!maps[name].has(axis))
        maps[name].set(
          axis,
          createCoordinates(coordinates.rect, axis, axis, safeZone)[name],
        );
    }
    const cache = new Map<Axis, Map<Axis, typeof primary>>();
    const resolve = (refs?: PlotAxisReference): typeof primary | undefined => {
      const horizontal = refs?.xAxis === undefined ? x : namedX.get(refs.xAxis);
      const vertical = refs?.yAxis === undefined ? y : namedY.get(refs.yAxis);
      if (!horizontal || !vertical) return undefined;
      if (horizontal === x && vertical === y) return primary;
      let pairs = cache.get(horizontal);
      if (!pairs) cache.set(horizontal, (pairs = new Map()));
      let pair = pairs.get(vertical);
      if (!pair) {
        pair = {
          x: horizontal,
          y: vertical,
          coordinates: {
            ...coordinates,
            x: maps.x.get(horizontal)!,
            y: maps.y.get(vertical)!,
          },
        };
        pairs.set(vertical, pair);
      }
      return pair;
    };
    const namedX = new Map(controller.axes.x);
    const namedY = new Map(controller.axes.y);
    const ticks = (
      axis: Axis,
      name: 'x' | 'y',
      map: Coordinates['x']['map'],
    ) => {
      const { major, minor } = axisTicks(
        axis,
        Math.max(
          2,
          Math.floor(
            name === 'x'
              ? coordinates.rect.width / 75
              : coordinates.rect.height / 36,
          ),
        ),
      );
      return {
        major: major.map(map),
        minor: minor.map(map),
        labels: major.map((value) => ({
          at: map(value),
          text: (axis.format ?? formatTickValue)(value),
        })),
      };
    };
    const grids = [...controller.grids].flatMap((refs) => {
      const grid = resolve(refs);
      if (!grid) return [];
      return [
        {
          x: ticks(grid.x, 'x', grid.coordinates.x.map),
          y: ticks(grid.y, 'y', grid.coordinates.y.map),
        },
      ];
    });
    return {
      coordinates,
      resolve,
      grids,
      axes: visible.map(({ name, axis, offset }) => ({
        name,
        side: axis.side,
        offset,
        labels: ticks(axis, name, maps[name].get(axis)!.map).labels,
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registered parts change with the version
  }, [
    logicalWidth,
    logicalHeight,
    header,
    legend,
    title,
    note,
    controller,
    version,
    x,
    y,
    safeZone,
  ]);
  const { coordinates, resolve } = geometry;
  const captioned = Boolean(title || note);
  const space = useMemo(
    () => ({ coordinates, x, y, captioned, resolve }),
    [coordinates, x, y, captioned, resolve],
  );
  const pointer = useRef<Point | null>(null);
  const invalidate = useDrawing(box, (ctx) => {
    const { rect } = coordinates;
    if (!rect.width || !rect.height) return;
    const { series, guides } = controller.order();
    const hovered = pointer.current;
    const points = guides.map((guide): Point => {
      const axes = resolve(guide)?.coordinates;
      return [
        axes?.x.map(guide.marker.x ?? NaN) ?? NaN,
        axes?.y.map(guide.marker.y ?? NaN) ?? NaN,
      ];
    });
    const selected = hovered
      ? hitTest(points, hovered[0], hovered[1], 14, grow(rect, edgeSlop))
      : -1;
    const font = numericFont(theme, fontsReady, 9);
    const samples = series.map((layer) => layer.data());
    const colors = series.map((layer, i) =>
      seriesColor(theme, layer.config, i),
    );
    const inside = hovered && contains(rect, hovered[0], hovered[1]);
    clipToViewport(ctx, rect, () => {
      for (const grid of geometry.grids) {
        drawGrid(ctx, rect, grid.x.minor, grid.y.minor, c.displayGrid, 0.45);
        drawGrid(ctx, rect, grid.x.major, grid.y.major, c.displayGrid);
      }
      for (let i = 0; i < series.length; i++) {
        const data = samples[i];
        const axes = resolve(series[i]!);
        if (!data || !axes) continue;
        drawSeries(
          ctx,
          axes.coordinates,
          axes.x.domain,
          series[i]!.config,
          data,
          colors[i]!,
          axes.y.domain[0],
        );
      }
      if (readout && inside) {
        drawSelection(ctx, rect, hovered[0], hovered[1], c.displayText);
      }
    });
    // Not clipped, so a handle at the end of an axis is whole.
    for (let i = 0; i < guides.length; i++) {
      const guide = guides[i]!;
      const axes = resolve(guide);
      if (!axes) continue;
      drawMarker(
        ctx,
        axes.coordinates,
        guide.marker,
        colorFor(theme, guide.marker.color ?? c.displayMuted),
        c.display,
        numericFont(theme, fontsReady, 10, true),
        selected === i || guide.focused,
      );
    }
    for (const axis of geometry.axes)
      drawAxes(
        ctx,
        rect,
        axis.name === 'x' ? axis.labels : [],
        axis.name === 'y' ? axis.labels : [],
        { axis: c.displayAxis, label: c.displayMuted, background: c.display },
        font,
        { x: axis.name === 'x', y: axis.name === 'y' },
        axis.side,
        axis.offset,
      );
    if (readout && inside) {
      paintReadout(
        ctx,
        hovered,
        coordinates,
        x,
        resolve,
        series,
        samples,
        colors,
        theme,
        fontsReady,
        box.width,
      );
    }
  });
  useLayoutEffect(() => {
    controller.frame = invalidate;
    return () => {
      controller.frame = () => {};
    };
  }, [controller, invalidate]);
  const canHover = readout || draggable > 0;
  return (
    <View
      ref={(value: UiNode | null) => {
        controller.root = value;
        controller.reorder();
      }}
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
      {(onBackgroundPress ||
        onBackgroundDoubleClick ||
        onBackgroundPointerMove ||
        onBackgroundPointerEnter ||
        onBackgroundPointerLeave ||
        onBackgroundContextMenu ||
        onBackgroundDrag) && (
        <PlotBackground
          space={space}
          onBackgroundPress={onBackgroundPress}
          onBackgroundDoubleClick={onBackgroundDoubleClick}
          onBackgroundPointerMove={onBackgroundPointerMove}
          onBackgroundPointerEnter={onBackgroundPointerEnter}
          onBackgroundPointerLeave={onBackgroundPointerLeave}
          onBackgroundContextMenu={onBackgroundContextMenu}
          onBackgroundDrag={onBackgroundDrag}
        />
      )}
      <ControllerContext.Provider value={controller}>
        <SpaceContext.Provider value={space}>{children}</SpaceContext.Provider>
      </ControllerContext.Provider>
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
  resolve: (
    refs: PlotAxisReference,
  ) => { coordinates: Coordinates; x: Axis; y: Axis } | undefined,
  series: readonly SeriesLayer[],
  samples: readonly (PlotSeriesData | undefined)[],
  colors: readonly string[],
  theme: Theme,
  ready: boolean,
  width: number,
) {
  const xValue = coordinates.x.invert(pointer[0]);
  const xLabel = (x.format ?? formatTickValue)(xValue);
  ctx.save();
  ctx.font = numericFont(theme, ready, 10);
  ctx.textBaseline = 'middle';
  let textWidth = ctx.measureText(xLabel).width;
  const labels: { text: string; color: string }[] = [];
  for (let i = 0; i < series.length; i++) {
    const { config } = series[i]!;
    const data = samples[i];
    const axes = resolve(series[i]!);
    if (!config.label || config.hideInReadout || !data || !axes) continue;
    const value = seriesValueAt(
      config,
      data,
      axes.coordinates.x.invert(pointer[0]),
      axes.x.domain,
    );
    if (value === null) continue;
    const color = colors[i]!;
    const text = `${config.label}  ${(axes.y.format ?? formatTickValue)(value)}`;
    const at = axes.coordinates.y.map(value);
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

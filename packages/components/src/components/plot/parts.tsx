import { Text, View } from '@soundor/react';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type {
  AccessibilityActionEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
  WheelEvent,
} from 'soundor:ui';

import {
  contains,
  edgeSlop,
  type Axis,
  type Coordinates,
  type Point,
} from '../../chart/geometry';
import {
  sampleExtent,
  type PlotBandSamples,
  type PlotSamples,
  type PlotSeries,
  type PlotSeriesData,
  type PlotSource,
} from '../../chart/series';
import { useXYPad } from '../../headless';
import { withActions, type HostProps } from '../../internal/host';
import {
  ring,
  textStyle,
  useComponent,
  useTheme,
  type StyleProps,
} from '../../theme';
import {
  usePlotController,
  usePlotSpace,
  type GuideLayer,
  type PlotController,
  type PlotAxisReference,
  type SeriesLayer,
} from './controller';
import { seriesColor } from './plot';

// Axes and grid ----------------------------------------------------------

export interface PlotAxisProps {
  id?: string;
  hidden?: boolean;
  /** The values at the ends of the axis. Without an axis, the data's extent. */
  domain: readonly [number, number];
  scale?: Axis['scale'];
  /** Where labelled ticks go; `'decades'` on a log scale: 10, 100, 1k… */
  ticks?: Axis['ticks'];
  /** Unlabelled ticks, for the grid: true for a log scale's 2–9 of each decade. */
  minorTicks?: Axis['minorTicks'];
  /** A tick's label: `formatters.frequency`, say. */
  format?: (value: number) => string;
}

function useAxis(
  name: 'x' | 'y',
  part: string,
  props: PlotAxisProps,
  side: 'top' | 'bottom' | 'left' | 'right',
) {
  const controller = usePlotController(part);
  const {
    id,
    hidden = false,
    domain,
    scale,
    ticks,
    minorTicks,
    format,
  } = props;
  const [lo, hi] = domain;
  // By value: ticks written inline are a new array each render, and the
  // same axis.
  const tickKey = typeof ticks === 'object' ? ticks.join() : ticks;
  const minorKey =
    typeof minorTicks === 'object' ? minorTicks.join() : minorTicks;
  const axis = useMemo(
    () => ({
      domain: [lo, hi] as const,
      scale,
      ticks,
      minorTicks,
      format,
      hidden,
      side,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lo, hi, scale, tickKey, minorKey, format, hidden, side],
  );
  useLayoutEffect(
    () => controller.setAxis(name, id, axis),
    [controller, name, id, axis],
  );
  return null;
}

/**
 * The horizontal axis: its domain, scale and labels. Drawn along the bottom,
 * with room kept for its labels. Give additional axes distinct IDs.
 */
function XAxis(props: PlotAxisProps & { position?: 'top' | 'bottom' }) {
  return useAxis('x', 'Plot.XAxis', props, props.position ?? 'bottom');
}

/** A vertical axis: drawn along the left by default, with room for its labels. */
function YAxis(props: PlotAxisProps & { position?: 'left' | 'right' }) {
  return useAxis('y', 'Plot.YAxis', props, props.position ?? 'left');
}

/** Lines at the axes' ticks, under every series. */
function Grid({ xAxis, yAxis }: PlotAxisReference) {
  const controller = usePlotController('Plot.Grid');
  useLayoutEffect(
    () => controller.addGrid({ xAxis, yAxis }),
    [controller, xAxis, yAxis],
  );
  return null;
}

// Series -----------------------------------------------------------------

/** What every series takes. */
interface SeriesStyle extends PlotAxisReference {
  /** Its name in the legend and the readout. */
  label?: string;
  /** A colour, or one of the theme's accents; the theme's voices in turn by default. */
  color?: string;
  opacity?: number;
  /** Left out of the readout: a reference line, a band's own curve. */
  hideInReadout?: boolean;
}

/**
 * A series' data: sorted `[x, y]` points, evenly spaced `values` (typed
 * arrays work), or a live `source` read at each frame. One of the three.
 */
export type PlotSeriesSamples =
  | { points: readonly Point[]; values?: never; source?: never }
  | { values: ArrayLike<number>; points?: never; source?: never }
  | { source: PlotSource<PlotSamples>; points?: never; values?: never };

interface Stroke {
  strokeWidth?: number;
  dash?: readonly number[];
  /**
   * Carry the first and last values level out to the edges of the plot. A
   * plot with draggable markers keeps a safe zone at the ends of its axes,
   * and a response, such as an EQ curve, should still reach the frame. Leave
   * it off for data that does not continue past its ends, such as a
   * transfer curve or an envelope.
   */
  extend?: boolean;
}

export type PlotLineProps = SeriesStyle & Stroke & PlotSeriesSamples;
export type PlotStepsProps = PlotLineProps;
export type PlotAreaProps = PlotLineProps & {
  /** Where the fill goes down to: the bottom of the y domain by default. */
  baseline?: number;
};
export type PlotBarsProps = SeriesStyle &
  PlotSeriesSamples & {
    /** Where the bars stand: the bottom of the y domain by default. */
    baseline?: number;
  };
export type PlotPointsProps = SeriesStyle &
  PlotSeriesSamples & {
    /** In pixels: 2.5 by default. */
    radius?: number;
  };

/** A band's edges, or a live `source` of them. One of the two. */
export type PlotBandProps = SeriesStyle &
  (
    | {
        lower: readonly Point[];
        upper: readonly Point[];
        source?: never;
      }
    | {
        source: PlotSource<PlotBandSamples>;
        lower?: never;
        upper?: never;
      }
  );

type SeriesType = NonNullable<PlotSeries['type']>;

/** What a series' props say its data is, checked: TypeScript can be got round. */
function samplesOf(
  part: string,
  props: {
    points?: readonly Point[];
    values?: ArrayLike<number>;
    lower?: readonly Point[];
    upper?: readonly Point[];
    source?: PlotSource<PlotSamples> | PlotSource<PlotBandSamples>;
  },
  band: boolean,
): {
  data: PlotSeriesData | null;
  source: PlotSource<PlotSamples | PlotBandSamples> | undefined;
} {
  const { points, values, lower, upper, source } = props;
  if (band) {
    const edges = lower !== undefined || upper !== undefined;
    if (edges === (source !== undefined) || (edges && (!lower || !upper)))
      throw new Error(`${part} takes lower and upper, or a source.`);
    return { data: edges ? { points: lower, upper } : null, source };
  }
  const given = [points, values, source].filter((v) => v !== undefined);
  if (given.length !== 1)
    throw new Error(`${part} takes one of points, values or source.`);
  return {
    data: points ? { points } : values ? { values } : null,
    source,
  };
}

function liveData(
  source: PlotSource<PlotSamples | PlotBandSamples>,
): PlotSeriesData | undefined {
  const now = source.get();
  if (!now) return undefined;
  return 'lower' in now ? { points: now.lower, upper: now.upper } : now;
}

/** A part's place in the tree: no layout, nothing to read, only an order. */
function useAnchor(
  layer: SeriesLayer | GuideLayer,
  controller: PlotController,
) {
  const attach = useCallback(
    (node: UiNode | null) => controller.place(layer, node),
    [layer, controller],
  );
  return (
    <View
      ref={attach}
      accessible={false}
      style={{ display: 'none', position: 'absolute' }}
    />
  );
}

function useSeries(
  part: string,
  type: SeriesType,
  props: SeriesStyle &
    Stroke & {
      baseline?: number;
      radius?: number;
      points?: readonly Point[];
      values?: ArrayLike<number>;
      lower?: readonly Point[];
      upper?: readonly Point[];
      source?: PlotSource<PlotSamples> | PlotSource<PlotBandSamples>;
    },
) {
  const controller = usePlotController(part);
  const { data, source } = samplesOf(part, props, type === 'band');
  const { points, values, lower, upper } = props;
  const extent = useMemo(
    () => (data ? sampleExtent(data) : null),
    // The data is its arrays: a new object around the same ones is no change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, values, lower, upper],
  );
  const [layer] = useState<SeriesLayer>(() => ({
    node: null,
    config: { type },
    data: () => undefined,
    extent: null,
  }));
  const { label, color, opacity, hideInReadout } = props;
  const { strokeWidth, dash, extend, baseline, radius } = props;
  // Every render: what it draws now, for the next frame.
  useLayoutEffect(() => {
    controller.updateSeries(layer, {
      config: {
        type,
        label,
        color,
        opacity,
        hideInReadout,
        strokeWidth,
        dash,
        extend,
        baseline,
        radius,
      },
      data: source ? () => liveData(source) : () => data ?? undefined,
      extent,
      xAxis: props.xAxis,
      yAxis: props.yAxis,
    });
  });
  useLayoutEffect(() => controller.addSeries(layer), [controller, layer]);
  // A live source draws at its own pace, without React.
  useLayoutEffect(
    () => source?.subscribe(controller.invalidate),
    [controller, source],
  );
  return useAnchor(layer, controller);
}

/** A line through the samples. */
function Line(props: PlotLineProps) {
  return useSeries('Plot.Line', 'line', props);
}

/** A line, filled faintly down to its baseline: a response, a spectrum. */
function Area(props: PlotAreaProps) {
  return useSeries('Plot.Area', 'area', props);
}

/** Each value held until the next: automation, a sequencer's steps. */
function Steps(props: PlotStepsProps) {
  return useSeries('Plot.Steps', 'steps', props);
}

/** A bar for each sample, standing on the baseline: an analyser's bands. */
function Bars(props: PlotBarsProps) {
  return useSeries('Plot.Bars', 'bars', props);
}

/** A dot for each sample: peaks, measurements. */
function Points(props: PlotPointsProps) {
  return useSeries('Plot.Points', 'points', props);
}

/** The region between two edges: a waveform's lowest and highest samples. */
function Band(props: PlotBandProps) {
  return useSeries('Plot.Band', 'band', props);
}

// Markers and guides -----------------------------------------------------

export interface PlotMarkerState {
  hovered: boolean;
  focused: boolean;
  dragging: boolean;
  selected: boolean;
  disabled: boolean;
}

export interface PlotMarkerProps
  extends PlotAxisReference, HostProps, StyleProps<'PlotMarker'> {
  x: number;
  y: number;
  /**
   * Drawn in the handle, and what assistive technology calls it: "Point 1",
   * "Point 2"… by default.
   */
  label?: string;
  color?: string;
  /** The handle's, in pixels: 8 with a label, 4 without. */
  radius?: number;
  hitRadius?: number;
  disabled?: boolean;
  selected?: boolean;
  movement?: 'x' | 'y' | 'both';
  constrain?: (point: Point) => Point;
  render?: (state: PlotMarkerState) => ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  describeValue?: (x: number, y: number) => string;
  onSelect?: (
    event: PointerEvent | KeyboardEvent | AccessibilityActionEvent,
  ) => void;
  onDoubleClick?: (event: PointerEvent) => void;
  onContextMenu?: (event: PointerEvent) => void;
  onWheel?: (event: WheelEvent) => void;
  onRemove?: () => void;
  onMoveCancel?: () => void;
  /**
   * Makes it draggable and keyboard adjustable: a tab stop of its own. It
   * is given the point the user moved it to; set `x` and `y` from it, or
   * the part you use.
   */
  onMove?: (point: Point) => void;
  /** A drag, or a key's adjustment, begins. */
  onMoveStart?: () => void;
  /** It ends, or is cancelled. */
  onMoveEnd?: () => void;
}

export interface PlotGuideProps extends PlotAxisReference {
  /** Where it is: a y for a horizontal line, an x for a vertical one. */
  value: number;
  /** Drawn beside it, at the plot's edge. */
  label?: string;
  color?: string;
  dash?: readonly number[];
}

function useGuide(
  part: string,
  marker: GuideLayer['marker'],
  safeZone: number,
  axes: PlotAxisReference,
) {
  const controller = usePlotController(part);
  const [layer] = useState<GuideLayer>(() => ({
    node: null,
    marker,
    focused: false,
    safeZone: 0,
  }));
  useLayoutEffect(() => controller.updateGuide(layer, marker, safeZone, axes));
  useLayoutEffect(() => controller.addGuide(layer), [controller, layer]);
  return { controller, layer, anchor: useAnchor(layer, controller) };
}

/** A point on the plot; with `onMove`, a handle to drag. */
function Marker({
  x,
  y,
  label,
  color,
  radius,
  hitRadius,
  onMove,
  onMoveStart,
  onMoveEnd,
  xAxis,
  yAxis,
  ...props
}: PlotMarkerProps) {
  const draggable = onMove !== undefined;
  const interactive = Boolean(
    draggable ||
    props.render ||
    props.ref ||
    props.onSelect ||
    props.onDoubleClick ||
    props.onContextMenu ||
    props.onWheel ||
    props.onRemove,
  );
  // A handle's radius and its halo, which is 5 pixels more.
  const zone = interactive
    ? Math.max(hitRadius ?? 0, (radius ?? (label ? 8 : 4)) + 5)
    : 0;
  const { controller, layer, anchor } = useGuide(
    'Plot.Marker',
    {
      x,
      y,
      label,
      color,
      radius,
      custom: Boolean(props.render),
      selected: props.selected,
      disabled: props.disabled,
    },
    zone,
    { xAxis, yAxis },
  );
  const space = usePlotSpace('Plot.Marker');
  // Unlabelled handles are numbered in the order they are drawn.
  useSyncExternalStore(
    controller.subscribe,
    controller.getVersion,
    controller.getVersion,
  );
  const number = draggable
    ? controller
        .order()
        .guides.filter((guide) => guide.safeZone > 0)
        .indexOf(layer) + 1
    : 0;
  const resolved = space.resolve({ xAxis, yAxis });
  const { coordinates } = resolved ?? space;
  const shown =
    interactive &&
    resolved &&
    contains(
      coordinates.rect,
      coordinates.x.map(x),
      coordinates.y.map(y),
      edgeSlop,
    );
  return (
    <>
      {anchor}
      {shown && (
        <MarkerControl
          {...props}
          x={x}
          y={y}
          radius={radius ?? 8}
          hitRadius={hitRadius}
          label={label ?? `Point ${Math.max(1, number)}`}
          coordinates={coordinates}
          xAxis={resolved.x}
          yAxis={resolved.y}
          onMove={onMove}
          onMoveStart={onMoveStart}
          onMoveEnd={onMoveEnd}
          onFocus={(focused) => controller.focus(layer, focused)}
        />
      )}
    </>
  );
}

interface MarkerControlProps extends Omit<PlotMarkerProps, 'xAxis' | 'yAxis'> {
  radius: number;
  label: string;
  coordinates: Coordinates;
  xAxis: Axis;
  yAxis: Axis;
  onFocus: (focused: boolean) => void;
}

/** A draggable marker's handle: an XYPad's interaction over the canvas. */
function MarkerControl({
  x,
  y,
  radius: own,
  hitRadius,
  label,
  coordinates,
  xAxis,
  yAxis,
  onMove,
  onMoveStart,
  onMoveEnd,
  onFocus,
  onMoveCancel,
  movement = 'both',
  constrain,
  disabled = false,
  selected = false,
  render,
  accessibilityLabel,
  accessibilityHint,
  describeValue,
  onSelect,
  onRemove,
  onDoubleClick,
  onContextMenu,
  onWheel,
  ref,
  accessibilityActions,
  onAccessibilityAction,
  ...props
}: MarkerControlProps) {
  const { theme, slot } = useComponent('PlotMarker', props);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const control = useXYPad(
    {
      disabled: disabled || !onMove || movement === 'y',
      value: x,
      defaultValue: x,
      min: xAxis.domain[0],
      max: xAxis.domain[1],
      scale: xAxis.scale,
      format: xAxis.format,
    },
    {
      disabled: disabled || !onMove || movement === 'x',
      value: y,
      defaultValue: y,
      min: yAxis.domain[0],
      max: yAxis.domain[1],
      scale: yAxis.scale,
      format: yAxis.format,
    },
    {
      label: accessibilityLabel ?? label,
      hint: accessibilityHint,
      describeValue,
      dragMode: 'relative',
      restoreOnPointerCancel: true,
      travel: [coordinates.inner.width, coordinates.inner.height],
      onPointChange: (currentX, currentY, cancelled) => {
        const point: Point = [currentX, currentY];
        onMove?.(!cancelled && constrain ? constrain(point) : point);
      },
      onInteractionStart: onMoveStart,
      onInteractionEnd: (cancelled) => {
        setDragging(false);
        try {
          if (cancelled) onMoveCancel?.();
        } finally {
          onMoveEnd?.();
        }
      },
    },
  );
  const atX = coordinates.x.map(x);
  const atY = coordinates.y.map(y);
  const radius = hitRadius ?? Math.max(12, own + 5);
  const actions = withActions(
    {
      accessibilityActions:
        onSelect && !disabled
          ? [
              ...(control.handlers.accessibilityActions ?? []),
              { name: 'activate' },
            ]
          : control.handlers.accessibilityActions,
      onAccessibilityAction: (event) => {
        if (onSelect && !disabled && event.actionName === 'activate') {
          onSelect(event);
          event.preventDefault();
        } else control.handlers.onAccessibilityAction?.(event);
      },
    },
    {
      accessibilityActions,
      onAccessibilityAction,
    },
  );
  return (
    <View
      {...control.handlers}
      {...actions}
      ref={ref}
      focusable={!disabled}
      accessibilityRole={
        onMove ? 'adjustable' : onSelect ? 'button' : undefined
      }
      accessibilityState={{
        ...control.handlers.accessibilityState,
        disabled,
        selected,
      }}
      onFocusVisibleChange={(event) => {
        setFocused(event.focusVisible);
        onFocus(event.focusVisible);
      }}
      onBlur={(event) => {
        control.handlers.onBlur?.(event);
        setFocused(false);
        onFocus(false);
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        if (disabled) return;
        if (event.button === 0) onSelect?.(event);
        if (!event.defaultPrevented && onMove) {
          control.handlers.onPointerDown?.(event);
          if (event.button === 0 && !event.altKey) setDragging(true);
        }
      }}
      onDoubleClick={
        disabled
          ? undefined
          : (onDoubleClick ??
            (onMove ? control.handlers.onDoubleClick : undefined))
      }
      onWheel={disabled ? undefined : onWheel}
      onContextMenu={disabled ? undefined : onContextMenu}
      onKeyDown={(event) => {
        if (disabled || event.defaultPrevented) return;
        if ((event.key === 'Enter' || event.key === ' ') && onSelect) {
          onSelect(event);
          event.preventDefault();
        } else if (
          (event.key === 'Backspace' || event.key === 'Delete') &&
          onRemove
        ) {
          onRemove();
          event.preventDefault();
        } else if (onMove) control.handlers.onKeyDown?.(event);
      }}
      style={[
        slot('root', {
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'default' : 'crosshair',
          opacity: disabled ? theme.opacity.opacityDisabled : 1,
          ...ring(theme, focused && Boolean(render)),
        }),
        {
          position: 'absolute',
          left: atX - radius,
          top: atY - radius,
          width: radius * 2,
          height: radius * 2,
        },
      ]}
    >
      {render && (
        <View accessible={false} style={{ pointerEvents: 'none' }}>
          {render({ hovered, focused, dragging, selected, disabled })}
        </View>
      )}
    </View>
  );
}

/** A level line across the plot: 0 dB, a threshold. */
function HorizontalLine({
  value,
  label,
  color,
  dash,
  xAxis,
  yAxis,
}: PlotGuideProps) {
  return useGuide('Plot.HorizontalLine', { y: value, label, color, dash }, 0, {
    xAxis,
    yAxis,
  }).anchor;
}

/** An upright line across the plot: a release point, a playhead you do not drag. */
function VerticalLine({
  value,
  label,
  color,
  dash,
  xAxis,
  yAxis,
}: PlotGuideProps) {
  return useGuide('Plot.VerticalLine', { x: value, label, color, dash }, 0, {
    xAxis,
    yAxis,
  }).anchor;
}

// Legend and readout -----------------------------------------------------

/** The labelled series' names and colours, at the top right. */
function Legend() {
  const controller = usePlotController('Plot.Legend');
  const { captioned } = usePlotSpace('Plot.Legend');
  const theme = useTheme();
  useLayoutEffect(() => controller.enable('legend'), [controller]);
  useSyncExternalStore(
    controller.subscribe,
    controller.getVersion,
    controller.getVersion,
  );
  const entries = controller
    .order()
    .series.map((layer, index) => ({
      config: layer.config,
      color: seriesColor(theme, layer.config, index),
    }))
    .filter((entry) => entry.config.label);
  return (
    <View
      style={{
        position: 'absolute',
        right: 18,
        top: captioned ? 32 : 12,
        flexDirection: 'row',
        gap: theme.spacing.spaceLg,
        pointerEvents: 'none',
      }}
    >
      {entries.map(({ config, color }, index) => (
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
              height: config.type === 'bars' || config.type === 'band' ? 6 : 2,
              borderRadius: 1,
              backgroundColor: color,
            }}
          />
          <Text
            style={[
              textStyle(theme, 'section', theme.color.displayText),
              { letterSpacing: 0.8 },
            ]}
          >
            {config.label!.toUpperCase()}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** The value of each labelled series under the pointer, with a crosshair. */
function Readout() {
  const controller = usePlotController('Plot.Readout');
  useLayoutEffect(() => controller.enable('readout'), [controller]);
  return null;
}

/**
 * The coordinates of the Plot a component of yours is in: `x.map(value)` is
 * where a value is across, `inner` the area the axes map to. For views of
 * your own over the plot, such as handles; `safeZone` on the Plot keeps them
 * whole at the ends of the axes.
 */
export function usePlotCoordinates(): Coordinates;
export function usePlotCoordinates(
  axes: PlotAxisReference,
): Coordinates | undefined;
export function usePlotCoordinates(
  axes?: PlotAxisReference,
): Coordinates | undefined {
  const space = usePlotSpace('usePlotCoordinates');
  return axes ? space.resolve(axes)?.coordinates : space.coordinates;
}

export const parts = {
  XAxis,
  YAxis,
  Grid,
  Line,
  Area,
  Steps,
  Bars,
  Points,
  Band,
  Marker,
  HorizontalLine,
  VerticalLine,
  Legend,
  Readout,
};

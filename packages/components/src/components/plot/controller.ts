import { createContext, useContext } from 'react';
import type { UiNode } from 'soundor:ui';

import type { Axis, Coordinates } from '../../chart/geometry';
import type { PlotSelection } from './selection';

export interface PlotAxisReference {
  xAxis?: string;
  yAxis?: string;
}

export type AxisSide = 'top' | 'bottom' | 'left' | 'right';
export type RegisteredAxis = Axis & { side: AxisSide; hidden: boolean };
import type {
  PlotMarker,
  PlotSeries,
  PlotSeriesData,
  SampleExtent,
} from '../../chart/series';

/** A series as the canvas draws it: read at each frame, never rendered. */
export interface SeriesLayer extends PlotAxisReference {
  /** Its place in the tree, for the order it is drawn and its default colour. */
  node: UiNode | null;
  config: PlotSeries;
  /** Its samples now: a static array, or a live source's snapshot. */
  data: () => PlotSeriesData | undefined;
  /** Of its static data, for an axis with no domain; none for a live source. */
  extent: SampleExtent | null;
  /** What of it is structure, as last drawn: undefined before its first. */
  key?: string;
}

/** A marker or a guide line, drawn over every series. */
export interface GuideLayer extends PlotAxisReference {
  id?: string;
  node: UiNode | null;
  marker: PlotMarker;
  /** Has keyboard focus: drawn highlighted. */
  focused: boolean;
  /** Draggable: the room its handle needs at the end of an axis. */
  safeZone: number;
}

type AxisName = 'x' | 'y';
type Feature = 'legend' | 'readout';

/**
 * What a Plot's parts register with it. Parts are components of their own,
 * anywhere under the Plot, so the Plot does not look at its children: each
 * part says what it is in a layout effect and takes it back as it unmounts.
 *
 * Two kinds of change are told apart. What the canvas draws (a series' style,
 * a live snapshot, a marker's place) only asks for a frame: `invalidate`, no
 * React render. What changes the Plot's layout or its views (an axis, the
 * legend, a draggable marker's room, a series' label) is `structure`, which
 * the Plot and its legend read with `useSyncExternalStore`.
 */
export class PlotController {
  readonly series = new Set<SeriesLayer>();
  readonly guides = new Set<GuideLayer>();
  readonly axes = {
    x: new Map<string | undefined, RegisteredAxis>(),
    y: new Map<string | undefined, RegisteredAxis>(),
  };
  readonly grids = new Set<PlotAxisReference>();
  private readonly features: Record<Feature, number> = {
    legend: 0,
    readout: 0,
  };
  private version = 0;
  private readonly listeners = new Set<() => void>();
  private ordered = false;
  private seriesOrder: SeriesLayer[] = [];
  private guideOrder: GuideLayer[] = [];
  /** The Plot's own view, whose tree gives the parts their order. */
  root: UiNode | null = null;
  /** Draws the next frame: set by the Plot once its canvas is there. */
  frame: () => void = () => {};
  /**
   * Asks the canvas for a frame, coalesced to one per display frame. The
   * same function for the Plot's life: a live source may subscribe it before
   * the Plot's canvas is ready.
   */
  invalidate = () => this.frame();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  /** The layout or the views change: the Plot renders again, and draws. */
  structure() {
    this.version++;
    for (const listener of this.listeners) listener();
    this.invalidate();
  }

  /**
   * A part rendered, came or went: the order is read from the tree again at
   * the next frame (a keyed list may have moved it).
   */
  reorder() {
    this.ordered = false;
  }

  axis(name: AxisName) {
    const axes = this.axes[name];
    return axes.get(undefined) ?? this.namedAxes(name)[0]?.[1];
  }

  namedAxes(name: AxisName) {
    return [...this.axes[name]].sort(([a], [b]) => {
      if (a === b) return 0;
      return a === undefined || (b !== undefined && a < b) ? -1 : 1;
    });
  }

  setAxis(name: AxisName, id: string | undefined, axis: RegisteredAxis) {
    const axes = this.axes[name];
    if (axes.has(id))
      throw new Error(
        `A Plot takes one Plot.${name === 'x' ? 'XAxis' : 'YAxis'}${id === undefined ? '.' : ` with id "${id}".`}`,
      );
    axes.set(id, axis);
    this.structure();
    return () => {
      if (axes.get(id) !== axis) return;
      axes.delete(id);
      this.structure();
    };
  }

  addGrid(grid: PlotAxisReference) {
    this.grids.add(grid);
    this.structure();
    return () => {
      this.grids.delete(grid);
      this.structure();
    };
  }

  has(feature: Feature) {
    return this.features[feature] > 0;
  }

  enable(feature: Feature) {
    this.features[feature]++;
    if (this.features[feature] === 1) this.structure();
    return () => {
      this.features[feature]--;
      if (this.features[feature] === 0) this.structure();
    };
  }

  addSeries(layer: SeriesLayer) {
    this.series.add(layer);
    this.reorder();
    this.structure();
    return () => {
      this.series.delete(layer);
      this.reorder();
      this.structure();
    };
  }

  addGuide(layer: GuideLayer) {
    this.guides.add(layer);
    this.reorder();
    this.structure();
    return () => {
      this.guides.delete(layer);
      this.reorder();
      this.structure();
    };
  }

  /**
   * Parts in the order they are in the tree, which is the order they are
   * drawn in: whatever order they mounted in, a series declared before
   * another is under it. Read again only after a part rendered.
   */
  order() {
    if (!this.ordered) {
      const index = new Map<UiNode, number>();
      const visit = (node: UiNode) => {
        for (const child of node.children) {
          index.set(child, index.size);
          visit(child);
        }
      };
      if (this.root) visit(this.root);
      const at = (node: UiNode | null) =>
        node ? (index.get(node) ?? Infinity) : Infinity;
      // Stable: a part not yet in the tree keeps the order it came in.
      this.seriesOrder = [...this.series].sort(
        (a, b) => at(a.node) - at(b.node),
      );
      this.guideOrder = [...this.guides].sort(
        (a, b) => at(a.node) - at(b.node),
      );
      this.ordered = true;
    }
    return { series: this.seriesOrder, guides: this.guideOrder };
  }

  /** A part's anchor attached, or went: its place in the tree. */
  place(layer: SeriesLayer | GuideLayer, node: UiNode | null) {
    layer.node = node;
    this.reorder();
  }

  /**
   * A series rendered: what it draws from the next frame. A change to what
   * the legend shows, or to the extent a default domain is made from, is
   * structure; the rest only draws.
   */
  updateSeries(
    layer: SeriesLayer,
    next: Pick<SeriesLayer, 'config' | 'data' | 'extent'> & PlotAxisReference,
  ) {
    const { type, label, color, hideInReadout } = next.config;
    const key = JSON.stringify([
      type,
      label,
      color,
      hideInReadout,
      next.extent,
      next.xAxis,
      next.yAxis,
    ]);
    const before = layer.key;
    layer.config = next.config;
    layer.data = next.data;
    layer.extent = next.extent;
    layer.xAxis = next.xAxis;
    layer.yAxis = next.yAxis;
    layer.key = key;
    this.reorder();
    if (before !== undefined && before !== key) this.structure();
    else this.invalidate();
  }

  /** A marker or guide rendered; a change to a handle's room is structure. */
  updateGuide(
    layer: GuideLayer,
    marker: GuideLayer['marker'],
    safeZone: number,
    axes: PlotAxisReference,
    id?: string,
  ) {
    layer.id = id;
    layer.marker = marker;
    layer.xAxis = axes.xAxis;
    layer.yAxis = axes.yAxis;
    this.reorder();
    if (layer.safeZone !== safeZone) {
      layer.safeZone = safeZone;
      this.structure();
    } else this.invalidate();
  }

  /** A handle took or lost keyboard focus: drawn highlighted, or not. */
  focus(layer: GuideLayer, focused: boolean) {
    layer.focused = focused;
    this.invalidate();
  }

  /** The largest room a draggable marker needs at the end of an axis. */
  safeZone() {
    let zone = 0;
    for (const guide of this.guides) zone = Math.max(zone, guide.safeZone);
    return zone;
  }
}

export const ControllerContext = createContext<PlotController | null>(null);

/** What a Plot's views are laid out in: changes with its size and axes. */
export interface PlotSpace {
  coordinates: Coordinates;
  x: Axis;
  y: Axis;
  /** Has a title or a note: the legend goes under it. */
  captioned: boolean;
  resolve: (
    axes?: PlotAxisReference,
  ) => { coordinates: Coordinates; x: Axis; y: Axis } | undefined;
  selection?: PlotSelection;
}

export const SpaceContext = createContext<PlotSpace | null>(null);

export function usePlotController(part: string) {
  const controller = useContext(ControllerContext);
  if (!controller) throw new Error(`${part} belongs inside a Plot.`);
  return controller;
}

export function usePlotSpace(part: string) {
  const space = useContext(SpaceContext);
  if (!space) throw new Error(`${part} belongs inside a Plot.`);
  return space;
}

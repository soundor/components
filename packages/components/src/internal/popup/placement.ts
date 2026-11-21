/**
 * Where a popup goes: beside an anchor (a node's box, or a point for a
 * context menu), on its preferred side unless there is more room on the
 * other, and always within the bounds (the view's safe area). Pure, and in
 * the view's logical pixels: what `getBoundingClientRect()` reports and an
 * overlay entry is laid out in.
 */

export type PopupSide = 'top' | 'bottom' | 'left' | 'right';
export type PopupAlign = 'start' | 'center' | 'end';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacementOptions {
  /** The side of the anchor the popup prefers. */
  side: PopupSide;
  /** Along that side: the anchor's start, its centre, or its end. */
  align: PopupAlign;
  /** Room between the anchor and the popup. */
  offset: number;
  /** A shift along the side, after alignment. */
  alignOffset: number;
  /**
   * The room kept between the popup and the edge of the bounds. A popup short
   * of room by no more than this may use it, rather than scroll for a few
   * pixels: on the far side of the anchor only.
   */
  padding: number;
  /** Take the opposite side when the preferred one is short of room and it has more. */
  flip: boolean;
  /** Device pixels per logical pixel: positions are rounded to whole device pixels. */
  scale: number;
}

export interface Placement {
  x: number;
  y: number;
  /** The side it is on, after any flip. */
  side: PopupSide;
  /**
   * The most the popup may measure along the side's axis (its height above or
   * below the anchor, its width beside it) to stay within the bounds: a long
   * list scrolls inside it.
   */
  maxHeight: number;
  maxWidth: number;
}

const opposite = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
} as const satisfies Record<PopupSide, PopupSide>;

function room(side: PopupSide, anchor: Box, bounds: Box, gap: number) {
  switch (side) {
    case 'top':
      return anchor.y - bounds.y - gap;
    case 'bottom':
      return bounds.y + bounds.height - (anchor.y + anchor.height) - gap;
    case 'left':
      return anchor.x - bounds.x - gap;
    case 'right':
      return bounds.x + bounds.width - (anchor.x + anchor.width) - gap;
  }
}

/** The side to use: the preferred one if the popup fits there, else whichever has more room. */
export function chooseSide(
  anchor: Box,
  size: { width: number; height: number },
  bounds: Box,
  options: Pick<PlacementOptions, 'side' | 'offset' | 'padding' | 'flip'>,
): PopupSide {
  const gap = options.offset + options.padding;
  const preferred = options.side;
  const vertical = preferred === 'top' || preferred === 'bottom';
  const length = vertical ? size.height : size.width;
  const here = room(preferred, anchor, bounds, gap);
  if (!options.flip || length <= here + options.padding) return preferred;
  const there = room(opposite[preferred], anchor, bounds, gap);
  return there > here ? opposite[preferred] : preferred;
}

const clampTo = (value: number, min: number, max: number) =>
  max < min ? min : Math.min(max, Math.max(min, value));

export function computePlacement(
  anchor: Box,
  size: { width: number; height: number },
  bounds: Box,
  options: PlacementOptions,
): Placement {
  const side = chooseSide(anchor, size, bounds, options);
  const vertical = side === 'top' || side === 'bottom';
  const gap = options.offset + options.padding;
  const length = vertical ? size.height : size.width;
  const roomAlong = Math.max(0, room(side, anchor, bounds, gap));
  // Short by no more than the padding: it takes the padding, to the edge.
  const toEdge = length > roomAlong && length <= roomAlong + options.padding;
  const along = toEdge ? roomAlong + options.padding : roomAlong;
  const across = Math.max(
    0,
    (vertical ? bounds.width : bounds.height) - 2 * options.padding,
  );
  // The popup's extent once held to the room it has.
  const width = Math.min(size.width, vertical ? across : along);
  const height = Math.min(size.height, vertical ? along : across);

  let x: number;
  let y: number;
  if (vertical) {
    y =
      side === 'bottom'
        ? anchor.y + anchor.height + options.offset
        : anchor.y - options.offset - height;
    x =
      options.align === 'start'
        ? anchor.x
        : options.align === 'end'
          ? anchor.x + anchor.width - width
          : anchor.x + (anchor.width - width) / 2;
    x += options.alignOffset;
  } else {
    x =
      side === 'right'
        ? anchor.x + anchor.width + options.offset
        : anchor.x - options.offset - width;
    y =
      options.align === 'start'
        ? anchor.y
        : options.align === 'end'
          ? anchor.y + anchor.height - height
          : anchor.y + (anchor.height - height) / 2;
    y += options.alignOffset;
  }

  // Never past the bounds, whatever the anchor: one partly or wholly outside
  // them (scrolled away, or a point at the edge) still has its popup inside.
  // The edge it reaches to, when it takes the padding, is the far one.
  const edge = (end: PopupSide) =>
    toEdge && end === side ? 0 : options.padding;
  x = clampTo(
    x,
    bounds.x + edge('left'),
    bounds.x + bounds.width - edge('right') - width,
  );
  y = clampTo(
    y,
    bounds.y + edge('top'),
    bounds.y + bounds.height - edge('bottom') - height,
  );

  const scale = options.scale > 0 ? options.scale : 1;
  const snap = (value: number) => Math.round(value * scale) / scale;
  return {
    x: snap(x),
    y: snap(y),
    side,
    maxHeight: vertical ? along : across,
    maxWidth: vertical ? across : along,
  };
}

export function samePlacement(a: Placement | null, b: Placement | null) {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.x === b.x &&
      a.y === b.y &&
      a.side === b.side &&
      a.maxHeight === b.maxHeight &&
      a.maxWidth === b.maxWidth)
  );
}

/**
 * A popup's size as its content would have it, from what it measures. Held to
 * a placement's maximum it measures that maximum, not its content: on an axis
 * at its cap, the larger of that and what it was known to need before stands.
 * Placing by the capped size would let a long list seem to fit the other
 * side, flip there, and flip back.
 */
export function naturalSize(
  measured: { width: number; height: number },
  cap: { maxWidth: number; maxHeight: number } | null,
  previous: { width: number; height: number } | null,
): { width: number; height: number } {
  const axis = (size: number, max: number | undefined, before = 0) =>
    max !== undefined && size >= max - 0.5 ? Math.max(size, before) : size;
  return {
    width: axis(measured.width, cap?.maxWidth, previous?.width),
    height: axis(measured.height, cap?.maxHeight, previous?.height),
  };
}

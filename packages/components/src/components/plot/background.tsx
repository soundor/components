import { View } from '@soundor/react';
import { useLayoutEffect, useRef } from 'react';
import type { PointerEvent } from 'soundor:ui';

import type { Coordinates, Point } from '../../chart/geometry';
import type { PlotAxisReference, PlotSpace } from './controller';

export interface PlotBackgroundEvent {
  /** Logical pixels relative to the Plot, including its axis margins. */
  point: Point;
  /** The same position in the default data space. */
  data: Point;
  /** The Soundor event, including modifiers and pointer identity. */
  event: PointerEvent;
  coordinates: Coordinates;
  coordinatesFor: (axes: PlotAxisReference) => Coordinates | undefined;
}

export interface PlotBackgroundDragEvent extends PlotBackgroundEvent {
  phase: 'start' | 'move' | 'end' | 'cancel';
  origin: Point;
}

export interface PlotBackgroundProps {
  onBackgroundPress?: (event: PlotBackgroundEvent) => void;
  onBackgroundDoubleClick?: (event: PlotBackgroundEvent) => void;
  onBackgroundPointerMove?: (event: PlotBackgroundEvent) => void;
  onBackgroundPointerEnter?: (event: PlotBackgroundEvent) => void;
  onBackgroundPointerLeave?: (event: PlotBackgroundEvent) => void;
  onBackgroundContextMenu?: (event: PlotBackgroundEvent) => void;
  onBackgroundDrag?: (event: PlotBackgroundDragEvent) => void;
}

export function PlotBackground({
  space,
  ...props
}: PlotBackgroundProps & { space: PlotSpace }) {
  const { coordinates } = space;
  const { rect } = coordinates;
  const drag = useRef<{
    id: number;
    origin: Point;
    last: PlotBackgroundEvent;
    notify: NonNullable<PlotBackgroundProps['onBackgroundDrag']>;
  } | null>(null);
  useLayoutEffect(
    () => () => {
      const held = drag.current;
      drag.current = null;
      if (held)
        held.notify({ ...held.last, origin: held.origin, phase: 'cancel' });
    },
    [],
  );
  const detail = (event: PointerEvent): PlotBackgroundEvent => {
    let left = 0;
    let top = 0;
    try {
      const box = event.currentTarget?.getBoundingClientRect();
      left = box?.x ?? 0;
      top = box?.y ?? 0;
    } catch {
      /* Simulated runtime has no layout. */
    }
    const point: Point = [
      event.pageX - left + rect.left,
      event.pageY - top + rect.top,
    ];
    return {
      point,
      data: [coordinates.x.invert(point[0]), coordinates.y.invert(point[1])],
      event,
      coordinates,
      coordinatesFor: (axes) => space.resolve(axes)?.coordinates,
    };
  };
  const finish = (event: PointerEvent, phase: 'end' | 'cancel') => {
    const held = drag.current;
    if (held?.id !== event.pointerId) return;
    drag.current = null;
    held.notify({ ...detail(event), origin: held.origin, phase });
  };
  return (
    <View
      accessible={false}
      style={{ position: 'absolute', ...rect }}
      onClick={
        props.onBackgroundPress &&
        ((event) => props.onBackgroundPress?.(detail(event)))
      }
      onDoubleClick={
        props.onBackgroundDoubleClick &&
        ((event) => props.onBackgroundDoubleClick?.(detail(event)))
      }
      onPointerEnter={
        props.onBackgroundPointerEnter &&
        ((event) => props.onBackgroundPointerEnter?.(detail(event)))
      }
      onPointerLeave={
        props.onBackgroundPointerLeave &&
        ((event) => props.onBackgroundPointerLeave?.(detail(event)))
      }
      onContextMenu={
        props.onBackgroundContextMenu &&
        ((event) => props.onBackgroundContextMenu?.(detail(event)))
      }
      onPointerDown={(event) => {
        const notify = props.onBackgroundDrag;
        if (
          !notify ||
          event.button !== 0 ||
          event.defaultPrevented ||
          drag.current
        )
          return;
        const last = detail(event);
        drag.current = {
          id: event.pointerId,
          origin: last.point,
          last,
          notify,
        };
        notify({ ...last, origin: last.point, phase: 'start' });
      }}
      onPointerMove={(event) => {
        const held = drag.current;
        if (!props.onBackgroundPointerMove && held?.id !== event.pointerId)
          return;
        const next = detail(event);
        props.onBackgroundPointerMove?.(next);
        if (held?.id === event.pointerId) {
          held.last = next;
          held.notify({ ...next, origin: held.origin, phase: 'move' });
        }
      }}
      onPointerUp={(event) => finish(event, 'end')}
      onPointerCancel={(event) => finish(event, 'cancel')}
    />
  );
}

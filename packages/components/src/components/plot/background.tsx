import { View } from '@soundor/react';
import { useLayoutEffect, useRef } from 'react';
import type { PointerEvent } from 'soundor:ui';

import type { Coordinates, Point } from '../../chart/geometry';
import type { PlotAxisReference, PlotSpace } from './controller';
import { crossedDragThreshold, watchCaptureLoss } from './pointer';

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
  threshold,
  ...props
}: PlotBackgroundProps & { space: PlotSpace; threshold: boolean }) {
  const { coordinates } = space;
  const { rect } = coordinates;
  const drag = useRef<{
    id: number;
    origin: Point;
    last: PlotBackgroundEvent;
    down: PointerEvent;
    started: boolean;
    suppressClick: boolean;
    unwatch: () => void;
    notify: NonNullable<PlotBackgroundProps['onBackgroundDrag']>;
  } | null>(null);
  const suppressed = useRef<number | null>(null);
  function close(
    held: NonNullable<typeof drag.current>,
    phase: 'end' | 'cancel',
    last = held.last,
  ) {
    drag.current = null;
    held.unwatch();
    if (phase === 'cancel' || held.suppressClick) suppressed.current = held.id;
    if (held.started) held.notify({ ...last, origin: held.origin, phase });
  }
  useLayoutEffect(
    () => () => {
      const held = drag.current;
      if (held) close(held, 'cancel');
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
    close(held, phase, detail(event));
  };
  return (
    <View
      accessible={false}
      style={{ position: 'absolute', ...rect }}
      onClick={
        props.onBackgroundPress &&
        ((event) => {
          if (suppressed.current !== event.pointerId)
            props.onBackgroundPress?.(detail(event));
        })
      }
      onDoubleClick={
        props.onBackgroundDoubleClick &&
        ((event) => {
          if (suppressed.current !== event.pointerId)
            props.onBackgroundDoubleClick?.(detail(event));
        })
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
        if (event.button !== 0 || drag.current) return;
        suppressed.current = null;
        const notify = props.onBackgroundDrag;
        if (!notify || event.defaultPrevented) return;
        const last = detail(event);
        const held = {
          id: event.pointerId,
          origin: last.point,
          last,
          down: event,
          started: !threshold,
          suppressClick: false,
          unwatch: watchCaptureLoss(event.pointerId, () => {
            if (drag.current === held) close(held, 'cancel');
          }),
          notify,
        };
        drag.current = held;
        if (held.started)
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
          held.suppressClick ||= crossedDragThreshold(held.down, event);
          if (held.started)
            held.notify({ ...next, origin: held.origin, phase: 'move' });
          else if (held.suppressClick) {
            held.started = true;
            held.notify({ ...next, origin: held.origin, phase: 'start' });
          }
        }
      }}
      onPointerUp={(event) => {
        if (event.button === 0) finish(event, 'end');
      }}
      onPointerCancel={(event) => finish(event, 'cancel')}
    />
  );
}

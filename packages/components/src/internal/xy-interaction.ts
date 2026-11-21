import type { ViewProps } from '@soundor/react';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'soundor:ui';

import { beginEdits, useGesture } from './gesture';
import { isResetKey, useRangeModel, type RangeProps } from './range';
import { clamp } from './scale';

export interface XYInteraction {
  label?: string;
  hint?: string;
  /** Relative drags keep the original grab offset, even past an edge. */
  dragMode?: 'absolute' | 'relative';
  inset?: number;
  insetTop?: number;
  /** Explicit horizontal and vertical travel, for handles over an existing display. */
  travel?: readonly [number, number];
  /** Optional keyboard increments expressed in plain units. */
  keyStep?: readonly [number, number];
  /**
   * Which host gestures an arrow key opens: both axes' (the default, as a
   * drag does), or only the axis it moves, so that a host recording touch
   * automation does not take the other as touched.
   */
  keyGesture?: 'both' | 'axis';
  /**
   * What a double-click resets: both axes (the default), or one, where the
   * other belongs to a control of its own as well (an envelope's decay
   * handle, whose level is the sustain's).
   */
  resetOnDoubleClick?: 'both' | 'x' | 'y';
  /**
   * Absolute drags: how near the handle's centre, in logical pixels, a press
   * grabs the handle where it is instead of jumping to the pointer. A
   * double-click resets only when it lands there: one away from the handle
   * jumps, and resets nothing. Without it, every press jumps.
   */
  grabRadius?: number;
  describeValue?: (x: number, y: number) => string;
  onPointChange?: (x: number, y: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function useXYPad(
  xProps: RangeProps,
  yProps: RangeProps,
  options: XYInteraction = {},
) {
  const x = useRangeModel(xProps);
  const y = useRangeModel(yProps);
  const disabled = x.disabled && y.disabled;
  const gesture = useGesture(disabled, xProps.parameter, yProps.parameter);
  const [focusVisible, setFocusVisible] = useState(false);
  const drag = useRef<{
    id: number;
    lastX: number;
    lastY: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const absolute = options.dragMode !== 'relative';
  // Whether the last press was on the handle, and whether the first press
  // of this series of clicks was: a double-click resets only then, as the
  // second press finds the handle where the first one moved it.
  const onHandle = useRef(true);
  const seriesOnHandle = useRef(true);
  const getBox = (event: PointerEvent) => {
    const box =
      absolute || !options.travel
        ? event.currentTarget?.getBoundingClientRect()
        : undefined;
    const inset = options.inset ?? 0;
    const insetTop = options.insetTop ?? inset;
    const width = Math.max(
      1,
      options.travel?.[0] ?? (box?.width ?? 0) - 2 * inset,
    );
    const height = Math.max(
      1,
      options.travel?.[1] ?? (box?.height ?? 0) - 2 * inset,
    );
    return {
      width,
      height,
      x: (event.pageX - (box?.x ?? 0) - inset) / width,
      y: 1 - (event.pageY - (box?.y ?? 0) - insetTop) / height,
    };
  };
  const notify = () => options.onPointChange?.(x.get(), y.get());
  const begin = (...axes: (typeof x)[]) => {
    const initialX = x.get();
    const initialY = y.get();
    const finish = beginEdits(
      ...axes.filter((axis) => !axis.disabled).map((axis) => axis.begin),
    );
    try {
      options.onInteractionStart?.();
    } catch (error) {
      finish(false);
      throw error;
    }
    return (cancel: boolean) => {
      try {
        finish(cancel);
        if (cancel) options.onPointChange?.(initialX, initialY);
      } finally {
        options.onInteractionEnd?.();
      }
    };
  };
  const beginBoth = () => begin(x, y);
  const step = (axis: typeof x, direction: number, fine: boolean) => {
    const amount = options.keyStep?.[axis === x ? 0 : 1];
    const rate = fine ? 0.1 : 1;
    if (amount === undefined) axis.nudge(direction, 0.01 * rate);
    else axis.set(axis.get() + direction * amount * rate);
  };
  /** Back to the defaults, of the axes a double-click resets: one gesture. */
  const reset = () => {
    const which = options.resetOnDoubleClick ?? 'both';
    const axes = which === 'x' ? [x] : which === 'y' ? [y] : [x, y];
    if (!gesture.start('discrete', () => begin(...axes))) return;
    try {
      for (const axis of axes) axis.set(axis.reset, false);
      notify();
    } finally {
      gesture.end();
    }
  };
  const describe =
    options.describeValue ??
    ((xValue, yValue) =>
      `${x.label ?? 'X'} ${x.format(xValue)}, ${y.label ?? 'Y'} ${y.format(yValue)}`);

  const handlers: ViewProps = {
    focusable: !disabled,
    accessibilityRole: 'adjustable',
    accessibilityLabel: options.label ?? x.label ?? 'XY pad',
    accessibilityHint:
      options.hint ?? 'Left and right adjust X. Up and down adjust Y.',
    accessibilityState: { disabled },
    accessibilityValue: {
      min: x.min,
      max: x.max,
      now: x.value,
      text: describe(x.value, y.value),
    },
    accessibilityActions: [
      ...(!x.disabled
        ? [{ name: 'increment' }, { name: 'decrement' }, { name: 'setValue' }]
        : []),
      ...(!y.disabled
        ? [
            { name: 'incrementY', label: `Increase ${y.label ?? 'Y'}` },
            { name: 'decrementY', label: `Decrease ${y.label ?? 'Y'}` },
          ]
        : []),
    ],
    onAccessibilityAction(event) {
      const { actionName } = event;
      const axis = actionName.endsWith('Y') ? y : x;
      if (axis.disabled) return;
      if (actionName === 'setValue') {
        const value = Number(event.value);
        if (
          event.value == null ||
          !Number.isFinite(value) ||
          !gesture.start('discrete', () => begin(axis))
        )
          return;
        try {
          axis.set(value);
          notify();
        } finally {
          gesture.end();
        }
      } else if (
        ['increment', 'decrement', 'incrementY', 'decrementY'].includes(
          actionName,
        )
      ) {
        if (!gesture.start('discrete', () => begin(axis))) return;
        try {
          step(axis, actionName.startsWith('increment') ? 1 : -1, false);
          notify();
        } finally {
          gesture.end();
        }
      } else return;
      event.preventDefault();
    },
    onFocusVisibleChange: (event) => setFocusVisible(event.focusVisible),
    onBlur: () => gesture.end(),
    onPointerDown(event) {
      if (event.button !== 0) return;
      // Alt-click (Option-click on a Mac) resets, as a double-click does,
      // without moving to the pointer first.
      if (event.altKey) {
        reset();
        return;
      }
      if (
        !gesture.start('pointer', () => {
          const finish = beginBoth();
          return (cancel) => {
            drag.current = null;
            finish(cancel);
          };
        })
      )
        return;
      const box = getBox(event);
      const grab = options.grabRadius;
      onHandle.current =
        !absolute ||
        grab === undefined ||
        Math.hypot(
          (box.x - x.normalize(x.get())) * box.width,
          (box.y - y.normalize(y.get())) * box.height,
        ) <= grab;
      // On the handle, or with Shift: grabbed where it is, keeping the offset.
      const keep = event.shiftKey || (grab !== undefined && onHandle.current);
      const jump = absolute && !keep;
      const nx = jump ? clamp(box.x) : x.normalize(x.get());
      const ny = jump ? clamp(box.y) : y.normalize(y.get());
      drag.current = {
        id: event.pointerId,
        lastX: event.pageX,
        lastY: event.pageY,
        x: nx,
        y: ny,
        offsetX: absolute && keep ? nx - box.x : 0,
        offsetY: absolute && keep ? ny - box.y : 0,
      };
      if (jump) {
        x.set(x.denormalize(nx));
        y.set(y.denormalize(ny));
        notify();
      }
    },
    onPointerMove(event) {
      const held = drag.current;
      if (held?.id !== event.pointerId || !gesture.is('pointer')) return;
      const box = getBox(event);
      if (absolute && !event.shiftKey) {
        held.x = clamp(box.x + held.offsetX);
        held.y = clamp(box.y + held.offsetY);
      } else {
        const rate = event.shiftKey ? 0.1 : 1;
        // Keep relative drag coordinates outside the range so reversing
        // direction doesn't detach the handle from where it was grabbed.
        // denormalize clamps the values written to the controls.
        held.x += ((event.pageX - held.lastX) / box.width) * rate;
        held.y += ((held.lastY - event.pageY) / box.height) * rate;
        if (absolute) {
          held.x = clamp(held.x);
          held.y = clamp(held.y);
          held.offsetX = held.x - box.x;
          held.offsetY = held.y - box.y;
        }
      }
      held.lastX = event.pageX;
      held.lastY = event.pageY;
      x.set(x.denormalize(held.x));
      y.set(y.denormalize(held.y));
      notify();
    },
    onPointerUp(event) {
      if (drag.current?.id === event.pointerId) gesture.end();
    },
    onPointerCancel(event) {
      if (drag.current?.id === event.pointerId) gesture.end();
    },
    onKeyDown(event) {
      const { key } = event;
      if (key === 'Escape' && gesture.is('pointer')) {
        gesture.end(true);
      } else if (isResetKey(event)) {
        // The axes a double-click resets.
        reset();
      } else if (
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'ArrowDown' ||
        key === 'ArrowUp'
      ) {
        const axis = key === 'ArrowLeft' || key === 'ArrowRight' ? x : y;
        if (
          axis.disabled ||
          !(options.keyGesture === 'axis'
            ? gesture.start(axis === x ? 'keysX' : 'keysY', () => begin(axis))
            : gesture.start('keys', beginBoth))
        )
          return;
        step(
          axis,
          key === 'ArrowRight' || key === 'ArrowUp' ? 1 : -1,
          event.shiftKey,
        );
        notify();
        gesture.deferEnd();
      } else return;
      event.preventDefault();
    },
    onDoubleClick(event) {
      // The second click of an Alt-click pair: the first one reset. Away
      // from the handle, the presses moved it there: no reset.
      if (!event.altKey && seriesOnHandle.current) reset();
    },
    onClick(event) {
      if (event.detail <= 1) seriesOnHandle.current = onHandle.current;
    },
  };

  return { x, y, disabled, handlers, focusVisible: focusVisible && !disabled };
}

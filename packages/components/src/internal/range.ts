import { useParameter, type ViewProps } from '@soundor/react';
import { useMemo, useRef, useState } from 'react';
import type { HistoryOptions } from 'soundor:history';
import type { KeyboardEvent, PointerEvent } from 'soundor:ui';

import { parsers, trueMinus } from './format';
import { useGesture } from './gesture';
import { clamp, createScale, snapValue, type ValueScale } from './scale';

/** Structural subset of a generated Soundor parameter. */
export interface ComponentParameter<T> {
  readonly info: {
    readonly label: string;
    readonly default: T;
    readonly access?: 'automatable' | 'manual' | 'readOnly';
  };
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
  set(value: T, options?: HistoryOptions): void;
}

export interface RangeParameter extends ComponentParameter<number> {
  readonly info: ComponentParameter<number>['info'] & {
    readonly min: number;
    readonly max: number;
    readonly step?: number;
  };
  beginGesture(options?: HistoryOptions): void;
  endGesture(): void;
  toNormalized(value?: number): number;
  fromNormalized(value: number): number;
  format(value?: number): string;
  parse(text: string): number | null;
}

/** Numeric control state. A parameter supplies its mapping, range and reset value. */
export interface RangeProps {
  parameter?: RangeParameter;
  label?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  onChangeStart?: () => void;
  onChangeEnd?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  scale?: ValueScale;
  format?: (value: number) => string;
  parse?: (text: string) => number | null;
  origin?: number;
  disabled?: boolean;
  /** Apply application-specific quantization before writing a value. */
  snap?: (value: number) => number;
  history?: HistoryOptions['history'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  debugId?: string;
}

const absent = { get: () => undefined, subscribe: () => () => {} };

export function useControlValue<T>(
  parameter: ComponentParameter<T> | undefined,
  value: T | undefined,
  initial: T,
) {
  const parameterValue = useParameter<T | undefined>(parameter ?? absent);
  const [own, setOwn] = useState(initial);
  const shown = parameterValue ?? value ?? own;
  return {
    value: shown,
    setOwn: (next: T) => {
      if (!parameter && value === undefined) setOwn(next);
    },
  };
}

export function useRangeModel(props: RangeProps) {
  const { parameter } = props;
  const min = parameter?.info.min ?? props.min ?? 0;
  const max = parameter?.info.max ?? props.max ?? 1;
  const step = parameter?.info.step ?? props.step;
  const reset = parameter?.info.default ?? props.defaultValue ?? min;
  const disabled =
    props.disabled === true || parameter?.info.access === 'readOnly';
  const label = props.label ?? parameter?.info.label;
  const own = useControlValue(parameter, props.value, reset);
  const mapping = useMemo(
    () => createScale([min, max], [0, 1], props.scale),
    [min, max, props.scale],
  );
  const normalize = (value: number) =>
    clamp(
      parameter?.toNormalized(clamp(value, min, max)) ??
        mapping.map(clamp(value, min, max)),
    );
  const denormalize = (value: number) =>
    parameter?.fromNormalized(clamp(value)) ??
    snapValue(mapping.invert(clamp(value)), min, max, step);
  const format =
    props.format ??
    (parameter
      ? (value: number) => parameter.format(value)
      : (value: number) => trueMinus(value.toFixed(2)));
  const parse =
    props.parse ??
    (parameter ? (text: string) => parameter.parse(text) : parsers.number);
  const edit = useRef<{ value: number } | null>(null);
  const get = () => parameter?.get() ?? edit.current?.value ?? own.value;
  const set = (value: number, quantize = true) => {
    if (disabled || !Number.isFinite(value)) return;
    const quantized = (quantize ? props.snap?.(value) : undefined) ?? value;
    if (!Number.isFinite(quantized)) return;
    const next = snapValue(
      quantized,
      min,
      max,
      !quantize || parameter ? undefined : step,
    );
    if (next === get()) return;
    parameter?.set(next);
    const actual = parameter?.get() ?? next;
    if (edit.current) edit.current.value = actual;
    own.setOwn(actual);
    props.onChange?.(actual);
  };
  const begin = () => {
    const start = get();
    parameter?.beginGesture({ history: props.history ?? true });
    edit.current = { value: start };
    try {
      props.onChangeStart?.();
    } catch (error) {
      edit.current = null;
      parameter?.endGesture();
      throw error;
    }
    return (cancel: boolean) => {
      let value = start;
      try {
        if (cancel) set(start, false);
        value = get();
      } finally {
        edit.current = null;
        parameter?.endGesture();
      }
      props.onChangeEnd?.(value);
    };
  };
  const nudge = (direction: number, fraction: number) => {
    const current = get();
    const next = denormalize(normalize(current) + direction * fraction);
    set(next === current && step ? current + direction * step : next);
  };

  return {
    value: own.value,
    normalized: normalize(own.value),
    origin: normalize(props.origin ?? min),
    min,
    max,
    label,
    disabled,
    reset,
    get,
    set,
    begin,
    normalize,
    denormalize,
    nudge,
    format,
    parse,
  };
}

/**
 * Delete, or Backspace (the key a Mac labels "delete"), on the control
 * itself: the keyboard's reset. Not with a command modifier, which makes a
 * shortcut of its own, nor from a text input inside a custom control.
 */
export function isResetKey(event: KeyboardEvent) {
  return (
    (event.key === 'Delete' || event.key === 'Backspace') &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.target === event.currentTarget
  );
}

export interface RangeInteraction {
  axis?: 'x' | 'y';
  dragMode?: 'absolute' | 'relative';
  /** Travel in logical pixels, or the node's usable length if omitted. */
  distance?: number;
  /** Insets at both ends of a length measured from the node. */
  inset?: number;
  /** Keep a legacy Home-to-default binding. End still goes to maximum. */
  resetOnHome?: boolean;
  /**
   * Absolute drags: how near the thumb's centre, in logical pixels along the
   * axis, a press grabs it where it is instead of jumping to the pointer. A
   * double-click resets only when it lands there: one away from the thumb
   * jumps, and resets nothing. Without it, every press jumps.
   */
  grabRadius?: number;
  /** Use an alternate double-click action, such as opening a text input. */
  onDoubleClick?: () => void;
  /** When provided, the wheel increments by this normalized fraction. */
  wheelStep?: number;
}

export function useRangeControl(
  props: RangeProps,
  options: RangeInteraction = {},
) {
  const range = useRangeModel(props);
  const gesture = useGesture(range.disabled, props.parameter);
  const [hovered, setHovered] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const drag = useRef<{
    id: number;
    last: number;
    position: number;
    fineOffset: number;
  } | null>(null);
  // Whether the last press was on the thumb, and whether the first press
  // of this series of clicks was: a double-click resets only then, as the
  // second press finds the thumb where the first one moved it.
  const onThumb = useRef(true);
  const seriesOnThumb = useRef(true);
  const axis = options.axis ?? 'y';
  const inset = options.inset ?? 0;
  const coord = (event: PointerEvent) =>
    axis === 'x' ? event.pageX : -event.pageY;
  const bounds = (event: PointerEvent) => {
    const box = event.currentTarget?.getBoundingClientRect();
    const length = axis === 'x' ? box?.width : box?.height;
    const start =
      axis === 'x'
        ? box?.x
        : box === undefined
          ? undefined
          : -(box.y + box.height);
    return {
      start: (start ?? 0) + inset,
      travel: Math.max(1, (length ?? 160) - 2 * inset),
    };
  };

  const discrete = (value: number, quantize = true) => {
    if (!gesture.start('discrete', range.begin)) return;
    try {
      range.set(value, quantize);
    } finally {
      gesture.end();
    }
  };
  const handlers: ViewProps = {
    debugId: props.debugId,
    focusable: !range.disabled,
    accessibilityRole: 'adjustable',
    accessibilityLabel: props.accessibilityLabel ?? range.label,
    accessibilityHint: props.accessibilityHint,
    accessibilityState: { disabled: range.disabled },
    accessibilityValue: {
      min: range.min,
      max: range.max,
      now: range.value,
      text: range.format(range.value),
    },
    accessibilityActions: range.disabled
      ? []
      : [
          { name: 'increment' },
          { name: 'decrement' },
          { name: 'setValue' },
          { name: 'reset', label: 'Reset to default' },
        ],
    onAccessibilityAction(event) {
      if (range.disabled) return;
      if (event.actionName === 'setValue') {
        const value = Number(event.value);
        if (event.value == null || !Number.isFinite(value)) return;
        discrete(value);
      } else if (event.actionName === 'reset') {
        discrete(range.reset, false);
      } else if (
        event.actionName === 'increment' ||
        event.actionName === 'decrement'
      ) {
        if (!gesture.start('discrete', range.begin)) return;
        try {
          range.nudge(event.actionName === 'increment' ? 1 : -1, 0.01);
        } finally {
          gesture.end();
        }
      } else return;
      event.preventDefault();
    },
    onFocusVisibleChange: (event) => setFocusVisible(event.focusVisible),
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onBlur: () => gesture.end(),
    onPointerDown(event) {
      if (event.button !== 0) return;
      // Alt-click (Option-click on a Mac) resets, as in Pro Tools and Logic:
      // no drag, and no Slider jump to the pointer first.
      if (event.altKey) {
        if (!range.disabled) discrete(range.reset, false);
        return;
      }
      if (
        !gesture.start('pointer', () => {
          const finish = range.begin();
          setPressed(true);
          return (cancel) => {
            drag.current = null;
            setPressed(false);
            finish(cancel);
          };
        })
      )
        return;
      const point = coord(event);
      const absolute = options.dragMode === 'absolute';
      const box = absolute ? bounds(event) : { start: 0, travel: 1 };
      const under = (point - box.start) / box.travel;
      const grab = options.grabRadius;
      onThumb.current =
        !absolute ||
        grab === undefined ||
        Math.abs(under - range.normalize(range.get())) * box.travel <= grab;
      // On the thumb, or with Shift: grabbed where it is, keeping the offset.
      const keep = event.shiftKey || (grab !== undefined && onThumb.current);
      const position =
        absolute && !keep ? clamp(under) : range.normalize(range.get());
      drag.current = {
        id: event.pointerId,
        last: point,
        position,
        fineOffset: keep ? position - under : 0,
      };
      if (absolute && !keep) range.set(range.denormalize(position));
    },
    onPointerMove(event) {
      const held = drag.current;
      if (held?.id !== event.pointerId || !gesture.is('pointer')) return;
      const point = coord(event);
      const absolute = options.dragMode === 'absolute';
      const box =
        absolute || options.distance === undefined
          ? bounds(event)
          : { start: 0, travel: options.distance };
      const under = (point - box.start) / box.travel;
      if (absolute && !event.shiftKey) {
        held.position = clamp(under + held.fineOffset);
      } else {
        held.position = clamp(
          held.position +
            ((point - held.last) / (options.distance ?? box.travel)) *
              (event.shiftKey ? 0.1 : 1),
        );
        if (absolute) held.fineOffset = held.position - under;
      }
      held.last = point;
      range.set(range.denormalize(held.position));
    },
    onPointerUp(event) {
      if (drag.current?.id === event.pointerId) gesture.end();
    },
    onPointerCancel(event) {
      if (drag.current?.id === event.pointerId) gesture.end();
    },
    onDoubleClick(event) {
      // The second click of an Alt-click pair: the first one reset. Away
      // from the thumb, the presses moved it there: no reset.
      if (range.disabled || event.altKey || !seriesOnThumb.current) return;
      if (options.onDoubleClick) options.onDoubleClick();
      else discrete(range.reset, false);
    },
    onClick(event) {
      if (event.detail <= 1) seriesOnThumb.current = onThumb.current;
    },
    onKeyDown(event) {
      if (event.key === 'Escape' && gesture.is('pointer')) {
        gesture.end(true);
        event.preventDefault();
        return;
      }
      if (isResetKey(event)) {
        if (range.disabled) return;
        discrete(range.reset, false);
        event.preventDefault();
        return;
      }
      const key = event.key;
      const up = key === 'ArrowUp' || key === 'ArrowRight' || key === 'PageUp';
      const down =
        key === 'ArrowDown' || key === 'ArrowLeft' || key === 'PageDown';
      if (!up && !down && key !== 'Home' && key !== 'End') return;
      if (!gesture.start('keys', range.begin)) return;
      if (key === 'Home')
        range.set(options.resetOnHome ? range.reset : range.min, false);
      else if (key === 'End') range.set(range.max);
      else
        range.nudge(
          up ? 1 : -1,
          (key.startsWith('Page') ? 0.1 : 0.01) * (event.shiftKey ? 0.1 : 1),
        );
      gesture.deferEnd();
      event.preventDefault();
    },
    onWheel(event) {
      const delta = event.deltaY || event.deltaX;
      if (delta === 0 || !gesture.start('wheel', range.begin)) return;
      range.nudge(
        -Math.sign(delta),
        (options.wheelStep ?? 0.01) * (event.shiftKey ? 0.1 : 1),
      );
      gesture.deferEnd();
      event.preventDefault();
    },
  };

  return {
    ...range,
    handlers,
    hovered: hovered && !range.disabled,
    focusVisible: focusVisible && !range.disabled,
    pressed: pressed && !range.disabled,
    commit: discrete,
  };
}

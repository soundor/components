import type { ViewProps } from '@soundor/react';
import { useRef, useState } from 'react';
import type { PointerEvent, UiNode, WheelEvent } from 'soundor:ui';

import { hitTest, type Coordinates, type Point } from '../chart/geometry';
import { formatters, parsers } from './format';
import { useRangeControl, type RangeParameter, type RangeProps } from './range';
import type { Domain, ValueScale } from './scale';
import { useXYPad } from './xy-interaction';

/**
 * An ADSR envelope as the editor shows it. Without parameters: attack, decay
 * and release in seconds, sustain a level from 0 to 1. Bound to parameters,
 * each is in its parameter's own units.
 */
export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export type EnvelopeStage = keyof ADSREnvelope;

export const envelopeStages = [
  'attack',
  'decay',
  'sustain',
  'release',
] as const satisfies readonly EnvelopeStage[];

export const defaultEnvelope: ADSREnvelope = {
  attack: 0.01,
  decay: 0.3,
  sustain: 0.7,
  release: 0.5,
};

const defaultLabels: Record<EnvelopeStage, string> = {
  attack: 'Attack',
  decay: 'Decay',
  sustain: 'Sustain',
  release: 'Release',
};

export interface EnvelopeOptions {
  /** Controlled: the envelope; pair it with `onChange`. */
  value?: ADSREnvelope;
  /** Uncontrolled: the envelope at first, and what double-click resets to. */
  defaultValue?: ADSREnvelope;
  /** After every change, with the whole envelope. */
  onChange?: (value: ADSREnvelope) => void;
  /** An edit of a stage began: a drag, a burst of keys. */
  onChangeStart?: (stage: EnvelopeStage) => void;
  /** It ended, with the stage's final value. */
  onChangeEnd?: (stage: EnvelopeStage, value: number) => void;
  /**
   * Parameters for any of the stages, which then take their range, mapping,
   * formatting and default from them, and report host gestures and undo
   * history. A stage without one uses `value` or `defaultValue`.
   */
  parameters?: Partial<Record<EnvelopeStage, RangeParameter>>;
  /** Attack, decay and release limits in seconds: 1 ms to 10 s by default. */
  timeRange?: Domain;
  /**
   * How a time maps across its segment: `'log'` (the default) gives a short
   * attack as much room as a long release; `'linear'` draws times to scale.
   */
  timeScale?: ValueScale;
  /** Shows a time in seconds: `20 ms`, `1.20 s` by default. */
  formatTime?: (seconds: number) => string;
  /** Reads a typed time, in seconds. */
  parseTime?: (text: string) => number | null;
  /** Shows the sustain level: `70%` by default. */
  formatLevel?: (level: number) => string;
  /**
   * How wide the sustain is drawn, against the width each of attack, decay
   * and release has at its longest: 0.5 by default. The sustain is a level
   * held for as long as a note is; it has no time of its own.
   */
  sustainWidth?: number;
  /** Names of the stages, read to assistive technology and shown. */
  labels?: Partial<Record<EnvelopeStage, string>>;
  disabled?: boolean;
}

/** Where each stage's handle is: in the plot's units, not seconds. */
export interface EnvelopeGeometry {
  domain: Domain;
  /** Start, attack peak, decay end, sustain end, release end. */
  points: readonly [Point, Point, Point, Point, Point];
  /** Each stage's handle, by stage. */
  handles: Record<EnvelopeStage, Point>;
}

/**
 * The visual model: attack, decay and release each take, across, their
 * value's position in [0, 1] through its mapping (a parameter's own, or
 * `timeScale`), one after the other; the sustain is held for a fixed
 * `sustainWidth` between decay and release. Levels go up from 0 to 1, the
 * sustain at its position through its mapping. The domain is fixed, so a
 * handle never runs from the pointer as the envelope changes.
 */
export function envelopeGeometry(
  positions: ADSREnvelope,
  sustainWidth: number,
): EnvelopeGeometry {
  const hold = Math.max(0, sustainWidth);
  const peak = positions.attack;
  const settle = peak + positions.decay;
  const held = settle + hold;
  const end = held + positions.release;
  const level = positions.sustain;
  const handles = {
    attack: [peak, 1],
    decay: [settle, level],
    sustain: [held, level],
    release: [end, 0],
  } as const satisfies Record<EnvelopeStage, Point>;
  return {
    domain: [0, 3 + hold],
    points: [
      [0, 0],
      handles.attack,
      handles.decay,
      handles.sustain,
      handles.release,
    ],
    handles,
  };
}

/** The radius in pixels a press finds the nearest handle within. */
export const handleReach = 14;

export interface EnvelopeHandle {
  stage: EnvelopeStage;
  /** Where it is, in pixels in the plot. */
  x: number;
  y: number;
  label: string;
  /** For the handle's view: focus, keys, assistive technology. */
  handlers: ViewProps;
  /** The handle's view's `ref`. */
  attach: (node: UiNode | null) => void;
  focusVisible: boolean;
  /** Under the pointer. */
  hovered: boolean;
  /** Being dragged. */
  pressed: boolean;
}

/**
 * The interaction of an ADSR editor drawn over a plot (`space`): one
 * focusable handle per stage, and a layer over the plot that gives a press to
 * the nearest handle, so that handles close together stay easy to grab.
 *
 * Each handle edits only its own stages, as a control bound to their
 * parameters does: attack (across), decay and sustain (across and up),
 * sustain (up), release (across). A drag, the arrow keys, Page Up and Down,
 * Home and End, the wheel and a double-click reset work on each, Shift for
 * finer steps and Escape to cancel a drag. Handles keep their order: a stage
 * is a length, so no handle can pass another.
 */
export function useEnvelopeEditor(
  options: EnvelopeOptions,
  space: Coordinates,
) {
  const {
    value,
    defaultValue = defaultEnvelope,
    onChange,
    onChangeStart,
    onChangeEnd,
    parameters = {},
    timeRange = [0.001, 10],
    timeScale = 'log',
    formatTime = (seconds: number) => formatters.time(seconds * 1000),
    parseTime = (text: string) => {
      const ms = parsers.number(text);
      return ms === null ? null : ms / 1000;
    },
    formatLevel = formatters.percent,
    sustainWidth = 0.5,
    labels = {},
    disabled = false,
  } = options;
  // One envelope for every handle: sustain is edited from two of them.
  const [own, setOwn] = useState(defaultValue);
  const shown = value ?? own;
  // Read when a value changes, from the hooks below: the latest of each.
  const snapshot = (): ADSREnvelope => ({
    attack: attack.get(),
    decay: decay.x.get(),
    sustain: sustain.get(),
    release: release.get(),
  });

  const rangeFor = (stage: EnvelopeStage): RangeProps => {
    const parameter = parameters[stage];
    const level = stage === 'sustain';
    return {
      parameter,
      label: labels[stage] ?? (parameter ? undefined : defaultLabels[stage]),
      value: parameter ? undefined : shown[stage],
      defaultValue: defaultValue[stage],
      min: level ? 0 : timeRange[0],
      max: level ? 1 : timeRange[1],
      scale: level ? 'linear' : timeScale,
      format: parameter ? undefined : level ? formatLevel : formatTime,
      parse: parameter ? undefined : level ? parsers.number : parseTime,
      disabled,
      onChange: (next) => {
        const envelope = { ...snapshot(), [stage]: next };
        if (value === undefined) setOwn(envelope);
        onChange?.(envelope);
      },
      onChangeStart: () => onChangeStart?.(stage),
      onChangeEnd: (next) => onChangeEnd?.(stage, next),
    };
  };

  const { inner } = space;
  const xSpan = space.x.map(1) - space.x.map(0);
  // Pixels a stage's whole travel takes: one unit across, the level's height.
  const slot = Math.max(1, Number.isFinite(xSpan) ? xSpan : inner.width / 3.5);
  const levelTravel = Math.max(1, inner.height);

  const attack = useRangeControl(rangeFor('attack'), {
    axis: 'x',
    distance: slot,
  });
  const decay = useXYPad(rangeFor('decay'), rangeFor('sustain'), {
    dragMode: 'relative',
    travel: [slot, levelTravel],
    keyGesture: 'axis',
    hint: 'Left and right change the decay, up and down the sustain',
  });
  const sustain = useRangeControl(rangeFor('sustain'), {
    axis: 'y',
    distance: levelTravel,
  });
  const release = useRangeControl(rangeFor('release'), {
    axis: 'x',
    distance: slot,
  });
  const geometry = envelopeGeometry(
    {
      attack: attack.normalized,
      decay: decay.x.normalized,
      sustain: sustain.normalized,
      release: release.normalized,
    },
    sustainWidth,
  );

  // Each handle's node, to focus the one a press finds.
  const [nodes] = useState(() => new Map<EnvelopeStage, UiNode>());
  const [hovered, setHovered] = useState<EnvelopeStage | null>(null);
  const [pressed, setPressed] = useState<EnvelopeStage | null>(null);
  const grabbed = useRef<EnvelopeStage | null>(null);
  const handlersOf = (stage: EnvelopeStage): ViewProps =>
    stage === 'attack'
      ? attack.handlers
      : stage === 'decay'
        ? decay.handlers
        : stage === 'sustain'
          ? sustain.handlers
          : release.handlers;
  const pixels = envelopeStages.map((stage): Point => [
    space.x.map(geometry.handles[stage][0]),
    space.y.map(geometry.handles[stage][1]),
  ]);
  const nearest = (event: PointerEvent) => {
    const index = hitTest(
      pixels,
      event.locationX,
      event.locationY,
      handleReach,
    );
    return index < 0 ? null : envelopeStages[index]!;
  };

  // A layer over the plot: the handles themselves let the pointer through.
  const layer: ViewProps = {
    accessible: false,
    onPointerDown(event) {
      if (disabled || event.button !== 0) return;
      const stage = nearest(event);
      if (!stage) return;
      // Focus goes to the handle, as a press on a control gives it.
      event.preventDefault();
      nodes.get(stage)?.focus();
      grabbed.current = stage;
      setPressed(stage);
      handlersOf(stage).onPointerDown?.(event);
    },
    onPointerMove(event) {
      const stage = grabbed.current;
      if (stage) {
        handlersOf(stage).onPointerMove?.(event);
        return;
      }
      const over = disabled ? null : nearest(event);
      if (over !== hovered) setHovered(over);
    },
    onPointerUp(event) {
      const stage = grabbed.current;
      if (!stage) return;
      grabbed.current = null;
      setPressed(null);
      handlersOf(stage).onPointerUp?.(event);
    },
    onPointerCancel(event) {
      const stage = grabbed.current;
      if (!stage) return;
      grabbed.current = null;
      setPressed(null);
      handlersOf(stage).onPointerCancel?.(event);
    },
    onPointerLeave() {
      if (hovered) setHovered(null);
    },
    onDoubleClick(event) {
      const stage = nearest(event);
      if (stage) handlersOf(stage).onDoubleClick?.(event);
    },
    onWheel(event: WheelEvent) {
      if (hovered) handlersOf(hovered).onWheel?.(event);
    },
  };

  const label = (stage: EnvelopeStage) =>
    stage === 'decay'
      ? (decay.x.label ?? defaultLabels.decay)
      : ((stage === 'attack' ? attack : stage === 'sustain' ? sustain : release)
          .label ?? defaultLabels[stage]);
  const handles = envelopeStages.map((stage, index): EnvelopeHandle => {
    const handlers = handlersOf(stage);
    return {
      stage,
      x: pixels[index]![0],
      y: pixels[index]![1],
      label: label(stage),
      handlers,
      attach: (node) => {
        if (node) nodes.set(stage, node);
        else nodes.delete(stage);
      },
      focusVisible:
        stage === 'attack'
          ? attack.focusVisible
          : stage === 'decay'
            ? decay.focusVisible
            : stage === 'sustain'
              ? sustain.focusVisible
              : release.focusVisible,
      hovered: hovered === stage,
      pressed: pressed === stage,
    };
  });

  return {
    /** The envelope now, in each stage's units. */
    value: snapshot(),
    /** Each stage's formatted value. */
    text: {
      attack: attack.format(attack.value),
      decay: decay.x.format(decay.x.value),
      sustain: sustain.format(sustain.value),
      release: release.format(release.value),
    } satisfies Record<EnvelopeStage, string>,
    /** The level at a height in [0, 1], formatted: for a level axis. */
    levelAt: (position: number) =>
      sustain.format(sustain.denormalize(position)),
    geometry,
    handles,
    /** Spread on a view over the whole plot, under the handles. */
    layerHandlers: layer,
    disabled,
  };
}

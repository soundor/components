import { vi } from 'vitest';

import { formatters, parsers, type RangeParameter } from './index';

export function parameter(initial = 0.5) {
  let value = initial;
  const listeners = new Set<(value: number) => void>();
  return {
    info: { label: 'Gain', min: 0, max: 1, default: initial },
    get: () => value,
    set: vi.fn<RangeParameter['set']>((next) => {
      value = next;
      for (const listener of listeners) listener(next);
    }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    beginGesture: vi.fn<RangeParameter['beginGesture']>(),
    endGesture: vi.fn<RangeParameter['endGesture']>(),
    toNormalized: (next = value) => next ** 0.5,
    fromNormalized: (normalized) => normalized ** 2,
    format: formatters.percent,
    parse: parsers.number,
  } satisfies RangeParameter;
}

/** A choice parameter, as generated: options with labels, set with history. */
export function choice<const T extends string>(
  options: readonly { value: T; label: string }[],
  initial: T,
  access: 'automatable' | 'manual' | 'readOnly' = 'automatable',
) {
  let value = initial;
  const listeners = new Set<(value: T) => void>();
  return {
    info: { label: 'Filter Type', default: initial, options, access },
    get: () => value,
    set: vi.fn<(next: T, options?: { history?: unknown }) => void>((next) => {
      value = next;
      for (const listener of listeners) listener(next);
    }),
    subscribe: (listener: (value: T) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

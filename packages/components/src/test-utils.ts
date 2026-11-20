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

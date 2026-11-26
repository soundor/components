import { createScale, type Domain } from '../../internal/scale';

export interface SpectrumFrame {
  /** Equally spaced frequency bins, including both ends. */
  values: ArrayLike<number>;
  frequencyRange: Domain;
}

/** Fixed-size sweep history; incoming arrays may be reused by the producer. */
export function createHistory(
  capacity: number,
  bins: number,
  frequencyRange: Domain,
  scale: 'linear' | 'log',
) {
  const values = new Float32Array(capacity * bins);
  const frequencies = new Float64Array(bins);
  const mapping = createScale(frequencyRange, [0, bins - 1], scale);
  for (let i = 0; i < bins; i++) frequencies[i] = mapping.invert(i);
  frequencies[0] = frequencyRange[0];
  frequencies[bins - 1] = frequencyRange[1];
  let next = 0;
  let size = 0;
  let pending = 0;
  return {
    values,
    get next() {
      return next;
    },
    get size() {
      return size;
    },
    get pending() {
      return pending;
    },
    markDrawn() {
      pending = 0;
    },
    push(frame: SpectrumFrame) {
      const [lo, hi] = frame.frequencyRange;
      const last = frame.values.length - 1;
      if (!(hi > lo) || !Number.isFinite(hi - lo) || last < 0) return;
      const factor = last / (hi - lo);
      for (let i = 0; i < bins; i++) {
        const hz = frequencies[i]!;
        values[next * bins + i] =
          hz < lo || hz > hi
            ? NaN
            : (frame.values[Math.round((hz - lo) * factor)] ?? NaN);
      }
      next = (next + 1) % capacity;
      size = Math.min(size + 1, capacity);
      pending = Math.min(pending + 1, capacity);
    },
  };
}

export type Domain = readonly [number, number];
export type ValueScale =
  | 'linear'
  | 'log'
  | { type: 'power' | 'symmetricPower'; exponent: number };

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function createScale(
  domain: Domain,
  range: Domain = [0, 1],
  scale: ValueScale = 'linear',
) {
  const [min, max] = domain;
  const [start, end] = range;
  const span = max - min;
  const pixelSpan = end - start;
  const signedPower = (value: number, exponent: number) =>
    Math.sign(value) * Math.abs(value) ** exponent;
  let normalize = (value: number) => (span === 0 ? 0 : (value - min) / span);
  let denormalize = (value: number) => min + value * span;
  if (scale === 'log' && min > 0 && max > 0 && span !== 0) {
    const base = Math.log(min);
    const extent = Math.log(max) - base;
    normalize = (value) => (Math.log(value) - base) / extent;
    denormalize = (value) => Math.exp(base + value * extent);
  } else if (
    typeof scale === 'object' &&
    Number.isFinite(scale.exponent) &&
    scale.exponent > 0 &&
    span !== 0
  ) {
    const { exponent } = scale;
    if (scale.type === 'symmetricPower') {
      const lo = signedPower(min, 1 / exponent);
      const extent = signedPower(max, 1 / exponent) - lo;
      normalize = (value) => (signedPower(value, 1 / exponent) - lo) / extent;
      denormalize = (value) => signedPower(lo + value * extent, exponent);
    } else {
      normalize = (value) => signedPower((value - min) / span, 1 / exponent);
      denormalize = (value) => min + signedPower(value, exponent) * span;
    }
  }
  return {
    map: (value: number) => start + normalize(value) * pixelSpan,
    invert: (value: number) =>
      denormalize(pixelSpan === 0 ? 0 : (value - start) / pixelSpan),
  };
}

export function snapValue(
  value: number,
  min: number,
  max: number,
  step?: number,
) {
  if (value <= min || min >= max) return min;
  if (value >= max) return max;
  return step && step > 0
    ? clamp(
        Number((min + Math.round((value - min) / step) * step).toPrecision(15)),
        min,
        max,
      )
    : value;
}

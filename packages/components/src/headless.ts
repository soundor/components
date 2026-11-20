import {
  useRangeControl,
  type RangeInteraction,
  type RangeProps,
} from './internal/range';

export type {
  ComponentParameter,
  RangeParameter,
  RangeProps,
  RangeInteraction,
} from './internal/range';
export type { ValueScale } from './internal/scale';
export { useXYPad, type XYInteraction } from './internal/xy-interaction';
export {
  useResizeGrip,
  type ResizeGripOptions,
} from './internal/resize-interaction';

export function useKnob(props: RangeProps, options?: RangeInteraction) {
  return useRangeControl(props, { axis: 'y', distance: 160, ...options });
}

export function useSlider(props: RangeProps, options?: RangeInteraction) {
  return useRangeControl(props, {
    axis: 'x',
    dragMode: 'absolute',
    ...options,
  });
}

export function useFader(props: RangeProps, options?: RangeInteraction) {
  return useRangeControl(props, {
    axis: 'y',
    dragMode: 'relative',
    ...options,
  });
}

export function useValueField(props: RangeProps, options?: RangeInteraction) {
  return useRangeControl(props, { axis: 'y', distance: 200, ...options });
}

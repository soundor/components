import { PlotFrequencyKeyboard } from '../frequency-keyboard';
import { parts } from './parts';
import { PlotRoot } from './plot';

/**
 * A canvas chart for responses and measurements: `<Plot>` and its parts,
 * `Plot.XAxis`, `Plot.Line`, `Plot.Marker` and the rest.
 */
export const Plot = Object.assign(PlotRoot, parts, {
  FrequencyKeyboard: PlotFrequencyKeyboard,
});

export type { PlotAxis, PlotProps } from './plot';
export type { PlotAxisReference } from './controller';
export type { PlotSelection, PlotGroupDrag } from './selection';
export type {
  PlotBackgroundProps,
  PlotBackgroundEvent,
  PlotBackgroundDragEvent,
} from './background';
export {
  usePlotCoordinates,
  type PlotAreaProps,
  type PlotAxisProps,
  type PlotBandProps,
  type PlotBarsProps,
  type PlotGuideProps,
  type PlotLineProps,
  type PlotMarkerProps,
  type PlotMarkerState,
  type PlotPointsProps,
  type PlotSeriesSamples,
  type PlotStepsProps,
} from './parts';

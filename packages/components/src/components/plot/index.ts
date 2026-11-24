import { parts } from './parts';
import { PlotRoot } from './plot';

/**
 * A canvas chart for responses and measurements: `<Plot>` and its parts,
 * `Plot.XAxis`, `Plot.Line`, `Plot.Marker` and the rest.
 */
export const Plot = Object.assign(PlotRoot, parts);

export type { PlotAxis, PlotProps } from './plot';
export {
  usePlotCoordinates,
  type PlotAreaProps,
  type PlotAxisProps,
  type PlotBandProps,
  type PlotBarsProps,
  type PlotGuideProps,
  type PlotLineProps,
  type PlotMarkerProps,
  type PlotPointsProps,
  type PlotSeriesSamples,
  type PlotStepsProps,
} from './parts';

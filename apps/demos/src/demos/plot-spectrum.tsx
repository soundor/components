import {
  Plot,
  formatters,
  type PlotSamples,
  type PlotSource,
} from '@soundor/components';
import { useEffect } from 'react';

type Point = [number, number];
const bins = 160;
const hz = (i: number) => 20 * 1000 ** (i / (bins - 1));

/**
 * A store a plot reads: a snapshot, and whoever wants to know when it
 * changes. In a plug-in this is fed by the audio side.
 */
function createSpectrum(): PlotSource<PlotSamples> & {
  points: Point[];
  publish(): void;
} {
  const points: Point[] = Array.from({ length: bins }, (_, i) => [hz(i), -90]);
  const snapshot = { points };
  const listeners = new Set<() => void>();
  return {
    points,
    get: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish() {
      for (const listener of listeners) listener();
    },
  };
}

// One source for each series: which data is which is in the markup.
const input = createSpectrum();
const output = createSpectrum();

export default function Demo() {
  useEffect(() => {
    let t = 0;
    const timer = setInterval(() => {
      t += 0.05;
      for (let i = 0; i < bins; i++) {
        const f = hz(i);
        const tilt = -22 - 4.5 * Math.log2(f / 100);
        const tone =
          18 *
          Math.exp(-(Math.log2(f / (220 + 140 * Math.sin(t))) ** 2) / 0.04);
        const noise = (Math.random() - 0.5) * 7;
        const level = Math.max(-90, tilt + tone + noise);
        input.points[i]![1] = level;
        // The output is the input through a low-pass at 4 kHz.
        output.points[i]![1] = Math.max(
          -90,
          level - 24 * Math.max(0, Math.log2(f / 4000)),
        );
      }
      input.publish();
      output.publish();
    }, 33);
    return () => clearInterval(timer);
  }, []);
  return (
    <Plot width={440} height={220} title="Spectrum">
      <Plot.XAxis
        domain={[20, 20_000]}
        scale="log"
        ticks="decades"
        format={formatters.frequency}
      />
      <Plot.YAxis
        domain={[-90, 0]}
        ticks={[-90, -60, -30, 0]}
        format={formatters.decibels}
      />
      <Plot.Grid />
      <Plot.Line label="Input" source={input} />
      <Plot.Area label="Output" source={output} baseline={-90} />
      <Plot.Legend />
      <Plot.Readout />
    </Plot>
  );
}

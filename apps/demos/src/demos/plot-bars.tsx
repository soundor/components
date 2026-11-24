import { Plot, formatters } from '@soundor/components';
import { useEffect, useState } from 'react';

// Third-octave band centres, 25 Hz to 16 kHz.
const centres = Array.from({ length: 28 }, (_, i) => 25 * 2 ** (i / 3));

export default function Demo() {
  const [levels, setLevels] = useState<number[]>(() => centres.map(() => -60));
  const [peaks, setPeaks] = useState<number[]>(() => centres.map(() => -60));
  useEffect(() => {
    let t = 0;
    const timer = setInterval(() => {
      t += 0.1;
      const next = centres.map((f, i) => {
        const tilt = -14 - 3 * Math.log2(f / 100);
        const beat = 14 * Math.max(0, Math.sin(t * 2 + i * 0.5)) ** 3;
        return Math.min(0, tilt + beat + (Math.random() - 0.5) * 5);
      });
      setLevels(next);
      // A peak holds, then falls.
      setPeaks((held) => held.map((peak, i) => Math.max(next[i]!, peak - 0.6)));
    }, 60);
    return () => clearInterval(timer);
  }, []);
  return (
    <Plot width={440} height={200} title="Third-octave analyser">
      <Plot.XAxis
        domain={[20, 20_000]}
        scale="log"
        ticks={[100, 1000, 10_000]}
        format={formatters.frequency}
      />
      <Plot.YAxis
        domain={[-60, 0]}
        ticks={[-60, -40, -20, 0]}
        format={formatters.decibels}
      />
      <Plot.Grid />
      <Plot.Bars
        label="Level"
        baseline={-60}
        points={centres.map((f, i) => [f, levels[i]!])}
      />
      <Plot.Points
        label="Peak"
        radius={1.5}
        hideInReadout
        points={centres.map((f, i) => [f, peaks[i]!])}
      />
      <Plot.Readout />
    </Plot>
  );
}

import { Plot, formatters, type PlotSeries } from '@soundor/components';
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
  const series: PlotSeries[] = [
    {
      label: 'Level',
      type: 'bars',
      baseline: -60,
      points: centres.map((f, i) => [f, levels[i]!]),
    },
    {
      label: 'Peak',
      type: 'points',
      radius: 1.5,
      hideInReadout: true,
      points: centres.map((f, i) => [f, peaks[i]!]),
    },
  ];
  return (
    <Plot
      width={440}
      height={200}
      title="Third-octave analyser"
      x={{
        domain: [20, 20_000],
        scale: 'log',
        ticks: [100, 1000, 10_000],
        format: formatters.frequency,
      }}
      y={{
        domain: [-60, 0],
        ticks: [-60, -40, -20, 0],
        format: formatters.decibels,
      }}
      series={series}
      readout
    />
  );
}

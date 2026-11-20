import { Plot, formatters, type PlotSeries } from '@soundor/components';
import { useState } from 'react';

const bars = 16;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function Demo() {
  // One value per step, 0 to 1: held until the next step.
  const [steps, setSteps] = useState<number[]>(() =>
    Array.from(
      { length: bars },
      (_, i) => Math.round((0.5 + 0.4 * Math.sin(i / 2.2)) * 20) / 20,
    ),
  );
  const series: PlotSeries[] = [
    {
      label: 'Cutoff',
      type: 'steps',
      points: [...steps, steps.at(-1)!].map((value, i) => [i, value]),
    },
  ];
  return (
    <Plot
      width={440}
      height={180}
      title="Cutoff automation"
      note="Drag a step"
      x={{
        domain: [0, bars],
        ticks: [0, 4, 8, 12, 16],
        format: (step) => `Step ${step}`,
      }}
      y={{ domain: [0, 1], ticks: [0, 0.5, 1], format: formatters.percent }}
      series={series}
      // A handle at the middle of each step.
      markers={steps.map((value, i) => ({
        x: i + 0.5,
        y: value,
        radius: 4,
        onMove: ([, y]: readonly [number, number]) =>
          setSteps((all) => all.map((v, j) => (j === i ? clamp(y) : v))),
      }))}
      accessibilityLabel="Cutoff automation, 16 steps"
    />
  );
}

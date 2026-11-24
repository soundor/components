import { Plot, formatters } from '@soundor/components';
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
  return (
    <Plot
      width={440}
      height={180}
      title="Cutoff automation"
      note="Drag a step"
      accessibilityLabel="Cutoff automation, 16 steps"
    >
      <Plot.XAxis
        domain={[0, bars]}
        ticks={[0, 4, 8, 12, 16]}
        format={(step) => `Step ${step}`}
      />
      <Plot.YAxis
        domain={[0, 1]}
        ticks={[0, 0.5, 1]}
        format={formatters.percent}
      />
      <Plot.Grid />
      <Plot.Steps
        label="Cutoff"
        points={[...steps, steps.at(-1)!].map((value, i) => [i, value])}
      />
      {/* A handle at the middle of each step. */}
      {steps.map((value, i) => (
        <Plot.Marker
          key={i}
          x={i + 0.5}
          y={value}
          radius={4}
          onMove={([, y]) =>
            setSteps((all) => all.map((v, j) => (j === i ? clamp(y) : v)))
          }
        />
      ))}
    </Plot>
  );
}

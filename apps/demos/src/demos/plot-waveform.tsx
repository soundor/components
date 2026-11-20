import { Plot, type PlotSeries } from '@soundor/components';
import { useEffect, useState } from 'react';

const length = 4; // Seconds.
const steps = 320;

// What a waveform overview is: the lowest and highest sample of each slice.
const lower: [number, number][] = [];
const upper: [number, number][] = [];
for (let i = 0; i < steps; i++) {
  const t = (i / (steps - 1)) * length;
  const swell = 0.25 + 0.75 * Math.abs(Math.sin(t * 1.6)) ** 1.5;
  const grain = 0.75 + 0.25 * Math.sin(i * 12.9898);
  lower.push([t, -swell * grain]);
  upper.push([t, swell * (0.8 + 0.2 * Math.cos(i * 4.1))]);
}
const series: PlotSeries[] = [
  { label: 'Sample', type: 'band', points: lower, upper },
];

export default function Demo() {
  const [time, setTime] = useState(0.8);
  const [scrubbing, setScrubbing] = useState(false);
  useEffect(() => {
    if (scrubbing) return;
    const timer = setInterval(
      () => setTime((now) => (now + 0.04) % length),
      40,
    );
    return () => clearInterval(timer);
  }, [scrubbing]);
  return (
    <Plot
      width={440}
      height={170}
      title="Sample"
      note="Drag the playhead"
      x={{
        domain: [0, length],
        ticks: [0, 1, 2, 3, 4],
        format: (s) => `${s} s`,
      }}
      y={{ domain: [-1, 1], ticks: [] }}
      series={series}
      markers={[
        {
          x: time,
          y: 0,
          label: '▶',
          onMoveStart: () => setScrubbing(true),
          onMove: ([x]) => setTime(x),
          onMoveEnd: () => setScrubbing(false),
        },
      ]}
      accessibilityLabel="Sample playhead"
    />
  );
}

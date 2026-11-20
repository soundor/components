import { Plot, formatters, type PlotSeries } from '@soundor/components';
import { useState } from 'react';

const hold = 1.2; // Seconds the key is held.
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function Demo() {
  const [attack, setAttack] = useState(0.2);
  const [decay, setDecay] = useState(0.35);
  const [sustain, setSustain] = useState(0.6);
  const [release, setRelease] = useState(0.6);
  const peak = attack;
  const settle = attack + decay;
  const end = hold + release;
  const series: PlotSeries[] = [
    {
      label: 'Envelope',
      type: 'area',
      baseline: 0,
      points: [
        [0, 0],
        [peak, 1],
        [settle, sustain],
        [hold, sustain],
        [end, 0],
      ],
    },
  ];
  return (
    <Plot
      width={440}
      height={200}
      title="Amplitude envelope"
      note="Drag the points"
      x={{
        domain: [0, 2],
        ticks: [0, 0.5, 1, 1.5, 2],
        format: (s) => formatters.time(s * 1000),
      }}
      y={{ domain: [0, 1.1], ticks: [0, 0.5, 1], format: formatters.percent }}
      series={series}
      markers={[
        {
          x: peak,
          y: 1,
          label: 'A',
          onMove: ([x]) => setAttack(clamp(x, 0.01, 0.8)),
        },
        {
          x: settle,
          y: sustain,
          label: 'D',
          onMove: ([x, y]) => {
            setDecay(clamp(x - attack, 0.02, 1));
            setSustain(clamp(y, 0, 1));
          },
        },
        {
          x: end,
          y: 0,
          label: 'R',
          onMove: ([x]) => setRelease(clamp(x - hold, 0.02, 0.8)),
        },
        { x: hold, color: '#8d8d9b', dash: [3, 3] },
      ]}
      accessibilityLabel="Amplitude envelope"
    />
  );
}

import { Plot, formatters } from '@soundor/components';
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
  return (
    <Plot
      width={440}
      height={200}
      title="Amplitude envelope"
      note="Drag the points"
      accessibilityLabel="Amplitude envelope"
    >
      <Plot.XAxis
        domain={[0, 2]}
        ticks={[0, 0.5, 1, 1.5, 2]}
        format={(s) => formatters.time(s * 1000)}
      />
      <Plot.YAxis
        domain={[0, 1.1]}
        ticks={[0, 0.5, 1]}
        format={formatters.percent}
      />
      <Plot.Grid />
      <Plot.Area
        label="Envelope"
        baseline={0}
        points={[
          [0, 0],
          [peak, 1],
          [settle, sustain],
          [hold, sustain],
          [end, 0],
        ]}
      />
      <Plot.Marker
        x={peak}
        y={1}
        label="A"
        onMove={([x]) => setAttack(clamp(x, 0.01, 0.8))}
      />
      <Plot.Marker
        x={settle}
        y={sustain}
        label="D"
        onMove={([x, y]) => {
          setDecay(clamp(x - attack, 0.02, 1));
          setSustain(clamp(y, 0, 1));
        }}
      />
      <Plot.Marker
        x={end}
        y={0}
        label="R"
        onMove={([x]) => setRelease(clamp(x - hold, 0.02, 0.8))}
      />
      {/* Where the key is released. */}
      <Plot.VerticalLine value={hold} color="#8d8d9b" dash={[3, 3]} />
    </Plot>
  );
}

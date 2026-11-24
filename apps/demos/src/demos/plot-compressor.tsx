import { Plot, Slider, formatters } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';

// Input level in, output level out: above the threshold, the ratio.
const transfer = (input: number, threshold: number, ratio: number) =>
  input <= threshold ? input : threshold + (input - threshold) / ratio;

const levels = [-60, -40, -20, 0];
const unity: [number, number][] = [
  [-60, -60],
  [0, 0],
];

export default function Demo() {
  const [threshold, setThreshold] = useState(-24);
  const [ratio, setRatio] = useState(4);
  return (
    <View style={{ gap: 12 }}>
      <Plot
        width={300}
        height={220}
        title="Compressor"
        note={`${formatters.decibels(threshold)} · ${ratio.toFixed(1)}:1`}
        accessibilityLabel="Compressor transfer curve"
      >
        <Plot.XAxis
          domain={[-60, 0]}
          ticks={levels}
          format={formatters.decibels}
        />
        <Plot.YAxis
          domain={[-60, 0]}
          ticks={levels}
          format={formatters.decibels}
        />
        <Plot.Grid />
        {/* 1:1, for reference. */}
        <Plot.Line points={unity} dash={[4, 4]} opacity={0.5} hideInReadout />
        <Plot.Area
          label="Output"
          baseline={-60}
          points={[-60, threshold, 0].map((x) => [
            x,
            transfer(x, threshold, ratio),
          ])}
        />
        <Plot.Marker
          x={threshold}
          y={threshold}
          label="T"
          // Only the threshold moves: the handle stays on the curve.
          onMove={([x]) =>
            setThreshold(Math.round(Math.min(-6, Math.max(-54, x))))
          }
        />
      </Plot>
      <Slider
        label="Ratio"
        min={1}
        max={20}
        value={ratio}
        onChange={setRatio}
        width={300}
      />
    </View>
  );
}

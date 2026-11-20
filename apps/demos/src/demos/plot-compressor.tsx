import { Plot, Slider, formatters, type PlotSeries } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';

// Input level in, output level out: above the threshold, the ratio.
const transfer = (input: number, threshold: number, ratio: number) =>
  input <= threshold ? input : threshold + (input - threshold) / ratio;

const inputs = [-60, 0];

export default function Demo() {
  const [threshold, setThreshold] = useState(-24);
  const [ratio, setRatio] = useState(4);
  const series: PlotSeries[] = [
    // 1:1, for reference.
    {
      type: 'line',
      dash: [4, 4],
      opacity: 0.5,
      hideInReadout: true,
      points: inputs.map((x) => [x, x]),
    },
    {
      label: 'Output',
      type: 'area',
      baseline: -60,
      points: [-60, threshold, 0].map((x) => [
        x,
        transfer(x, threshold, ratio),
      ]),
    },
  ];
  return (
    <View style={{ gap: 12 }}>
      <Plot
        width={300}
        height={220}
        title="Compressor"
        note={`${formatters.decibels(threshold)} · ${ratio.toFixed(1)}:1`}
        x={{
          domain: [-60, 0],
          ticks: [-60, -40, -20, 0],
          format: formatters.decibels,
        }}
        y={{
          domain: [-60, 0],
          ticks: [-60, -40, -20, 0],
          format: formatters.decibels,
        }}
        series={series}
        markers={[
          {
            x: threshold,
            y: threshold,
            label: 'T',
            // Only the threshold moves: the handle stays on the curve.
            onMove: ([x]) =>
              setThreshold(Math.round(Math.min(-6, Math.max(-54, x)))),
          },
        ]}
        accessibilityLabel="Compressor transfer curve"
      />
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

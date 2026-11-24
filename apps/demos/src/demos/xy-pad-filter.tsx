import { Plot, XYPad, formatters } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';

const frequencies = Array.from({ length: 96 }, (_, i) => 20 * 1000 ** (i / 95));

// A resonant low-pass, as magnitude in dB.
function lowPass(hz: number, cutoff: number, resonance: number) {
  const r = hz / cutoff;
  const q = 0.5 + resonance * 9.5;
  const magnitude = 1 / Math.sqrt((1 - r * r) ** 2 + (r / q) ** 2);
  return 20 * Math.log10(magnitude);
}

export default function Demo() {
  const [cutoff, setCutoff] = useState(1200);
  const [resonance, setResonance] = useState(0.35);
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <XYPad
        title="Filter"
        x={{
          label: 'Cutoff',
          min: 20,
          max: 20_000,
          scale: 'log',
          value: cutoff,
          onChange: setCutoff,
          format: formatters.frequency,
        }}
        y={{
          label: 'Resonance',
          value: resonance,
          onChange: setResonance,
          format: formatters.percent,
        }}
        width={170}
        height={170}
      />
      <Plot width={260} height={170}>
        <Plot.XAxis
          domain={[20, 20_000]}
          scale="log"
          ticks={[100, 1000, 10_000]}
          format={formatters.frequency}
        />
        <Plot.YAxis
          domain={[-24, 24]}
          ticks={[-24, 0, 24]}
          format={formatters.decibels}
        />
        <Plot.Grid />
        <Plot.Area
          label="Filter"
          baseline={-24}
          points={frequencies.map((hz) => [hz, lowPass(hz, cutoff, resonance)])}
        />
      </Plot>
    </View>
  );
}

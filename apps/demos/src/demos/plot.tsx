import { Plot, formatters } from '@soundor/components';
import { useState } from 'react';

const response = Array.from({ length: 96 }, (_, i): [number, number] => {
  const hz = 20 * 1000 ** (i / 95);
  const gain =
    12 / (1 + (hz / 1800) ** 2 / 3) -
    4 +
    5 * Math.exp(-((Math.log10(hz) - 2.4) ** 2 / 0.05));
  return [hz, gain];
});

export default function Demo() {
  const [point, setPoint] = useState<readonly [number, number]>([1800, 4]);
  return (
    <Plot width={420} height={190} title="Response">
      <Plot.XAxis
        domain={[20, 20_000]}
        scale="log"
        ticks="decades"
        format={formatters.frequency}
      />
      <Plot.YAxis domain={[-24, 24]} format={formatters.decibels} />
      <Plot.Grid />
      <Plot.Area label="EQ" points={response} baseline={0} extend />
      <Plot.Marker x={point[0]} y={point[1]} label="1" onMove={setPoint} />
      <Plot.Readout />
    </Plot>
  );
}

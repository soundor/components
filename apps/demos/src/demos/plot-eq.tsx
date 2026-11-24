import { Plot, formatters } from '@soundor/components';
import { useState } from 'react';

interface Band {
  hz: number;
  db: number;
  /** Narrower for a higher Q. */
  q: number;
}

// A bell on the log-frequency axis: the gain at the band's centre, falling
// off with the distance in octaves.
const bell = (band: Band, hz: number) =>
  band.db *
  Math.exp(-(Math.log2(hz / band.hz) ** 2) / (2 * (0.9 / band.q) ** 2));

const frequencies = Array.from(
  { length: 128 },
  (_, i) => 20 * 1000 ** (i / 127),
);

/** Each band on its own, quiet and out of the readout: a part of yours. */
function BandCurves({ bands }: { bands: readonly Band[] }) {
  return bands.map((band, i) => (
    <Plot.Line
      key={i}
      extend
      dash={[3, 3]}
      opacity={0.45}
      hideInReadout
      points={frequencies.map((hz) => [hz, bell(band, hz)])}
    />
  ));
}

export default function Demo() {
  const [bands, setBands] = useState<Band[]>([
    { hz: 90, db: 5, q: 1.2 },
    { hz: 1000, db: -6, q: 0.9 },
    { hz: 6500, db: 7, q: 1.4 },
  ]);
  return (
    <Plot
      width={440}
      height={220}
      title="Parametric EQ"
      note="Drag a band"
      accessibilityLabel="Parametric EQ"
    >
      <Plot.XAxis
        domain={[20, 20_000]}
        scale="log"
        ticks="decades"
        format={formatters.frequency}
      />
      <Plot.YAxis
        domain={[-12, 12]}
        ticks={[-12, -6, 0, 6, 12]}
        format={formatters.decibels}
      />
      <Plot.Grid />
      <Plot.Area
        label="Total"
        baseline={0}
        // Reaches the frame, past the handles' safe zone.
        extend
        points={frequencies.map((hz) => [
          hz,
          bands.reduce((sum, band) => sum + bell(band, hz), 0),
        ])}
      />
      <BandCurves bands={bands} />
      {bands.map((band, i) => (
        <Plot.Marker
          key={i}
          x={band.hz}
          y={band.db}
          label={String(i + 1)}
          onMove={([hz, db]) =>
            setBands((all) =>
              all.map((b, j) => (j === i ? { ...b, hz, db } : b)),
            )
          }
        />
      ))}
    </Plot>
  );
}

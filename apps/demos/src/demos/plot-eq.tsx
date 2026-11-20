import { Plot, formatters, type PlotSeries } from '@soundor/components';
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

export default function Demo() {
  const [bands, setBands] = useState<Band[]>([
    { hz: 90, db: 5, q: 1.2 },
    { hz: 1000, db: -6, q: 0.9 },
    { hz: 6500, db: 7, q: 1.4 },
  ]);
  const series: PlotSeries[] = [
    {
      label: 'Total',
      type: 'area',
      baseline: 0,
      // Reaches the frame, past the handles' safe zone.
      extend: true,
      points: frequencies.map((hz) => [
        hz,
        bands.reduce((sum, band) => sum + bell(band, hz), 0),
      ]),
    },
    // Each band on its own, quiet and out of the readout.
    ...bands.map((band): PlotSeries => ({
      type: 'line',
      extend: true,
      dash: [3, 3],
      opacity: 0.45,
      hideInReadout: true,
      points: frequencies.map((hz) => [hz, bell(band, hz)]),
    })),
  ];
  return (
    <Plot
      width={440}
      height={220}
      title="Parametric EQ"
      note="Drag a band"
      x={{
        domain: [20, 20_000],
        scale: 'log',
        ticks: 'decades',
        format: formatters.frequency,
      }}
      y={{
        domain: [-12, 12],
        ticks: [-12, -6, 0, 6, 12],
        format: formatters.decibels,
      }}
      series={series}
      markers={bands.map((band, i) => ({
        x: band.hz,
        y: band.db,
        label: String(i + 1),
        onMove: ([hz, db]) =>
          setBands((all) =>
            all.map((b, j) => (j === i ? { ...b, hz, db } : b)),
          ),
      }))}
      accessibilityLabel="Parametric EQ"
    />
  );
}

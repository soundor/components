import {
  Button,
  ControlGroup,
  Fader,
  Knob,
  LevelMeter,
  Panel,
  Plot,
  SegmentedControl,
  TextField,
  Toggle,
  ValueField,
  XYPad,
  formatters,
  parsers,
  type PlotSeries,
} from '@soundor/components';
import { View } from '@soundor/react';
import { useEffect, useRef, useState } from 'react';

// A channel strip, to show the controls working together: the EQ plot draws
// the bands and the filter as one curve, and the meter shows what the
// compressor and the gain do to a signal.

interface Band {
  hz: number;
  db: number;
  q: number;
}
type FilterType = 'off' | 'low-pass' | 'high-pass';

const frequencies = Array.from(
  { length: 140 },
  (_, i) => 20 * 1000 ** (i / 139),
);
const bell = (band: Band, hz: number) =>
  band.db *
  Math.exp(-(Math.log2(hz / band.hz) ** 2) / (2 * (0.9 / band.q) ** 2));

// A resonant 2-pole filter's gain in dB, kept inside the plot's range.
function filterDb(type: FilterType, hz: number, cutoff: number, res: number) {
  if (type === 'off') return 0;
  const r = type === 'low-pass' ? hz / cutoff : cutoff / hz;
  const q = 0.6 + res * 8;
  const magnitude = 1 / Math.sqrt((1 - r * r) ** 2 + (r / q) ** 2);
  return Math.max(-12, Math.min(12, 20 * Math.log10(magnitude)));
}

export default function Demo() {
  const [preset, setPreset] = useState('Vocal Bus');
  const [slot, setSlot] = useState<'A' | 'B'>('A');
  const [bypass, setBypass] = useState(false);
  const [saving, setSaving] = useState(false);
  // Two settings to compare: A and B each keep their own bands.
  const [banks, setBanks] = useState<Record<'A' | 'B', Band[]>>({
    A: [
      { hz: 110, db: 4, q: 1.1 },
      { hz: 2200, db: -5, q: 1.0 },
      { hz: 9000, db: 6, q: 0.8 },
    ],
    B: [
      { hz: 60, db: -3, q: 0.9 },
      { hz: 800, db: 3, q: 1.3 },
      { hz: 4500, db: 5, q: 1.6 },
    ],
  });
  const bands = banks[slot];
  const setBands = (change: (all: Band[]) => Band[]) =>
    setBanks((all) => ({ ...all, [slot]: change(all[slot]) }));
  const [type, setType] = useState<FilterType>('high-pass');
  const [cutoff, setCutoff] = useState(80);
  const [resonance, setResonance] = useState(0.25);
  const [threshold, setThreshold] = useState(-22);
  const [ratio, setRatio] = useState(4);
  const [attack, setAttack] = useState(12);
  const [release, setRelease] = useState(180);
  const [gain, setGain] = useState(0);
  const [mix, setMix] = useState(1);
  const [levels, setLevels] = useState<[number, number]>([-60, -60]);

  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => setSaving(false), 1500);
    return () => clearTimeout(timer);
  }, [saving]);

  // The meter reads the compressor and the gain, so turning them is audible
  // in the picture. The input is a drum-like pulse, never the same twice.
  const settings = useRef({ threshold, ratio, gain, bypass, mix });
  useEffect(() => {
    settings.current = { threshold, ratio, gain, bypass, mix };
  }, [threshold, ratio, gain, bypass, mix]);
  useEffect(() => {
    let t = 0;
    const timer = setInterval(() => {
      t += 0.14;
      const hit = Math.max(0, Math.sin(t * 2)) ** 4;
      const { threshold, ratio, gain, bypass, mix } = settings.current;
      const channel = (offset: number) => {
        const input = -34 + hit * 36 + (Math.random() - 0.5) * 4 + offset;
        if (bypass) return input;
        const squeezed =
          input > threshold ? threshold + (input - threshold) / ratio : input;
        // Mix blends the squeezed signal with the dry one, in amplitude.
        const wet =
          10 ** (squeezed / 20) * mix + 10 ** (input / 20) * (1 - mix);
        return 20 * Math.log10(wet) + gain;
      };
      setLevels([channel(0), channel(-2)]);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const series: PlotSeries[] = [
    {
      label: 'Response',
      type: 'area',
      baseline: 0,
      extend: true,
      opacity: bypass ? 0.3 : 1,
      points: frequencies.map((hz) => [
        hz,
        bypass
          ? 0
          : bands.reduce((sum, band) => sum + bell(band, hz), 0) +
            filterDb(type, hz, cutoff, resonance),
      ]),
    },
    ...bands.map((band): PlotSeries => ({
      type: 'line',
      extend: true,
      dash: [3, 3],
      opacity: 0.4,
      hideInReadout: true,
      points: frequencies.map((hz) => [hz, bypass ? 0 : bell(band, hz)]),
    })),
  ];

  return (
    <Panel
      title="Atlas · Channel strip"
      indicator={!bypass}
      trailing={
        <Toggle
          variant="chip"
          size="sm"
          label="Bypass"
          value={bypass}
          onChange={setBypass}
        />
      }
    >
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
          <TextField
            label="Preset"
            value={preset}
            onChange={setPreset}
            placeholder="Untitled"
            width={170}
          />
          <SegmentedControl<'A' | 'B'>
            label="Slot"
            value={slot}
            onChange={setSlot}
            options={[
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
            ]}
          />
          <View style={{ flex: 1 }} />
          <Button
            variant="ghost"
            onPress={() => setBands((b) => b.map((x) => ({ ...x, db: 0 })))}
          >
            Flatten
          </Button>
          <Button
            variant="accent"
            loading={saving}
            onPress={() => setSaving(true)}
          >
            Save
          </Button>
        </View>
        <View
          style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}
        >
          <View style={{ gap: 12 }}>
            <Plot
              width={420}
              height={200}
              title="Equalizer"
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
                onMove: ([hz, db]: readonly [number, number]) =>
                  setBands((all) =>
                    all.map((b, j) => (j === i ? { ...b, hz, db } : b)),
                  ),
              }))}
              accessibilityLabel="Equalizer"
            />
            <ControlGroup title="Dynamics" direction="row" dividers>
              <Knob
                label="Threshold"
                min={-60}
                max={0}
                value={threshold}
                onChange={setThreshold}
                format={formatters.decibels}
              />
              <Knob
                label="Ratio"
                min={1}
                max={20}
                scale="log"
                value={ratio}
                onChange={setRatio}
                format={(v) => `${v.toFixed(1)}:1`}
              />
              <Knob
                label="Attack"
                min={0.1}
                max={100}
                scale="log"
                value={attack}
                onChange={setAttack}
                format={formatters.time}
              />
              <Knob
                label="Release"
                min={10}
                max={1000}
                scale="log"
                value={release}
                onChange={setRelease}
                format={formatters.time}
              />
              <Knob
                label="Mix"
                value={mix}
                onChange={setMix}
                format={formatters.percent}
              />
            </ControlGroup>
          </View>
          <View style={{ gap: 12, alignItems: 'center' }}>
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
            <SegmentedControl<FilterType>
              label="Type"
              value={type}
              onChange={setType}
              size="sm"
              options={[
                { value: 'off', label: 'Off' },
                { value: 'low-pass', label: 'LP' },
                { value: 'high-pass', label: 'HP' },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <ValueField
                label="Gain"
                min={-24}
                max={6}
                value={gain}
                onChange={setGain}
                format={formatters.decibels}
                parse={parsers.number}
                width={72}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LevelMeter
              label="Out"
              value={levels}
              min={-48}
              max={6}
              warningAt={-6}
              clipAt={0}
              ticks={[-36, -24, -12, -6, 0]}
              peakHold={1.5}
              fallRate={18}
              length={250}
            />
            <Fader
              label="Gain"
              min={-24}
              max={6}
              value={gain}
              onChange={setGain}
              ticks={[-24, -12, 0, 6]}
              length={250}
            />
          </View>
        </View>
      </View>
    </Panel>
  );
}

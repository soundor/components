import {
  Button,
  ContextMenu,
  Knob,
  LevelMeter,
  Menu,
  Plot,
  Popover,
  Select,
  SelectableList,
  Tooltip,
  ValueField,
  formatters,
  type PlotSamples,
  type PlotSource,
  type SelectOption,
} from '@soundor/components';
import { textStyle, useTheme } from '@soundor/components/theme';
import { Text, View } from '@soundor/react';
import { useEffect, useRef, useState } from 'react';
import type { UiNode } from 'soundor:ui';

import { FilterIcon } from '../filter-icon';

type Shape = 'peak' | 'low' | 'high';
const shapes: readonly SelectOption<Shape>[] = (
  [
    { value: 'peak', label: 'Bell' },
    { value: 'low', label: 'Low shelf' },
    { value: 'high', label: 'High shelf' },
  ] as const
).map((option) => ({
  ...option,
  icon: ({ color }) => <FilterIcon shape={option.value} color={color} />,
}));
type Band = {
  id: string;
  hz: number;
  db: number;
  q: number;
  shape: Shape;
  enabled: boolean;
};
const frequencies = Array.from(
  { length: 160 },
  (_, i) => 20 * 1000 ** (i / 159),
);
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Illustrative shapes in log-frequency space, not filter responses from DSP.
function response(band: Band, hz: number) {
  if (!band.enabled) return 0;
  const octaves = Math.log2(hz / band.hz) * band.q;
  return (
    band.db *
    (band.shape === 'peak'
      ? Math.exp(-(octaves ** 2))
      : 1 / (1 + Math.exp((band.shape === 'low' ? 1 : -1) * octaves * 3)))
  );
}

function spectrum() {
  const points = frequencies.map((hz): [number, number] => [hz, -90]);
  const listeners = new Set<() => void>();
  const snapshot: PlotSamples = { points };
  const source: PlotSource<PlotSamples> = {
    get: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    points,
    source,
    publish: () => listeners.forEach((listener) => listener()),
  };
}

export default function Demo() {
  const theme = useTheme();
  const [bands, setBands] = useState<Band[]>([
    { id: '1', hz: 90, db: 5, q: 1.2, shape: 'low', enabled: true },
    { id: '2', hz: 1000, db: -6, q: 0.9, shape: 'peak', enabled: true },
    { id: '3', hz: 6500, db: 7, q: 1.4, shape: 'high', enabled: true },
  ]);
  const nextId = useRef(4);
  const [range, setRange] = useState(12);
  const [selectedIds, setSelection] = useState<readonly string[]>([]);
  const [editing, setEditing] = useState<string>();
  const marker = useRef<UiNode | null>(null);
  const currentBands = useRef(bands);
  const groupStart = useRef(bands);
  const [input] = useState(spectrum);
  const [output] = useState(spectrum);
  useEffect(() => {
    currentBands.current = bands;
  }, [bands]);
  useEffect(() => {
    let time = 0;
    const timer = setInterval(() => {
      time += 0.04;
      for (let i = 0; i < frequencies.length; i++) {
        const hz = frequencies[i]!;
        const level = clamp(
          -39 -
            5 * Math.log2(hz / 200) +
            8 * Math.sin(i * 0.18 - time) +
            3 * Math.sin(i * 3 + time * 9),
          -90,
          0,
        );
        input.points[i]![1] = level;
        output.points[i]![1] = clamp(
          level +
            currentBands.current.reduce(
              (sum, band) => sum + response(band, hz),
              0,
            ),
          -90,
          0,
        );
      }
      input.publish();
      output.publish();
    }, 33);
    return () => clearInterval(timer);
  }, [input, output]);

  const band = bands.find((entry) => entry.id === editing);
  const edit = (id: string, change: Partial<Band>) =>
    setBands((all) =>
      all.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  const add = (hz: number, db: number) => {
    const id = String(nextId.current++);
    setBands((all) => [
      ...all,
      {
        id,
        hz: clamp(hz, 20, 20000),
        db: clamp(db, -range, range),
        q: 1,
        shape: 'peak',
        enabled: true,
      },
    ]);
    setSelection([id]);
    setEditing(id);
  };
  const remove = (ids: readonly string[]) => {
    setBands((all) => all.filter((entry) => !ids.includes(entry.id)));
    setSelection((all) => all.filter((id) => !ids.includes(id)));
    if (editing && ids.includes(editing)) setEditing(undefined);
  };
  return (
    <View style={{ gap: theme.spacing.spaceSm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.spaceSm,
        }}
      >
        <Plot
          width={420}
          height={236}
          title="Band editor"
          note="Simulated data"
          accessibilityLabel="Equalizer response and spectrum"
          selection={{
            selectedIds,
            onSelectionChange: (ids) => {
              setSelection(ids);
              if (!ids.length) setEditing(undefined);
            },
            multiple: true,
            rectangle: true,
            onGroupDrag: ({ phase, ids, delta, coordinates }) => {
              if (phase === 'start') groupStart.current = bands;
              if (phase === 'cancel') setBands(groupStart.current);
              if (phase !== 'move') return;
              const selected = groupStart.current.filter((item) =>
                ids.includes(item.id),
              );
              const dx = clamp(
                delta[0],
                Math.max(
                  ...selected.map(
                    (item) =>
                      coordinates.x.map(20) - coordinates.x.map(item.hz),
                  ),
                ),
                Math.min(
                  ...selected.map(
                    (item) =>
                      coordinates.x.map(20000) - coordinates.x.map(item.hz),
                  ),
                ),
              );
              const dy = clamp(
                delta[1],
                Math.max(
                  ...selected.map(
                    (item) =>
                      coordinates.y.map(range) - coordinates.y.map(item.db),
                  ),
                ),
                Math.min(
                  ...selected.map(
                    (item) =>
                      coordinates.y.map(-range) - coordinates.y.map(item.db),
                  ),
                ),
              );
              setBands(
                groupStart.current.map((item) =>
                  ids.includes(item.id)
                    ? {
                        ...item,
                        hz: coordinates.x.invert(
                          coordinates.x.map(item.hz) + dx,
                        ),
                        db: coordinates.y.invert(
                          coordinates.y.map(item.db) + dy,
                        ),
                      }
                    : item,
                ),
              );
            },
          }}
          onBackgroundDoubleClick={({ data: [hz, db] }) => add(hz, db)}
        >
          <Plot.XAxis
            domain={[20, 20000]}
            scale="log"
            format={formatters.frequency}
          />
          <Plot.YAxis
            domain={[-range, range]}
            ticks={[-range, 0, range]}
            format={formatters.decibels}
          />
          <Plot.YAxis
            id="spectrum"
            domain={[-90, 0]}
            ticks={[-90, -60, -30, 0]}
            position="right"
            format={(value) => `${value} dBFS`}
          />
          <Plot.Grid />
          <Plot.Area
            source={input.source}
            yAxis="spectrum"
            opacity={0.24}
            label="Input"
          />
          <Plot.Area
            source={output.source}
            yAxis="spectrum"
            opacity={0.35}
            label="Output"
          />
          {bands.map((item) => (
            <Plot.Line
              key={item.id}
              opacity={0.45}
              dash={[3, 3]}
              hideInReadout
              points={frequencies.map((hz) => [hz, response(item, hz)])}
            />
          ))}
          <Plot.Line
            label="Combined"
            extend
            strokeWidth={2}
            points={frequencies.map((hz) => [
              hz,
              bands.reduce((sum, item) => sum + response(item, hz), 0),
            ])}
          />
          <Plot.Legend />
          {bands.map((item) => (
            <ContextMenu key={item.id}>
              <ContextMenu.Trigger>
                <Plot.Marker
                  id={item.id}
                  label={item.id}
                  accessibilityLabel={`Band ${item.id}`}
                  ref={item.id === editing ? marker : undefined}
                  x={item.hz}
                  y={item.db}
                  color={item.enabled ? undefined : theme.color.displayMuted}
                  describeValue={(hz, db) =>
                    `${formatters.frequency(hz)}, ${formatters.decibels(db)}, Q ${item.q.toFixed(2)}`
                  }
                  onSelect={(event) => {
                    if (
                      !('shiftKey' in event) ||
                      !(event.shiftKey || event.ctrlKey || event.metaKey)
                    )
                      setEditing(item.id);
                  }}
                  onMove={([hz, db]) => edit(item.id, { hz, db })}
                  onWheel={(event) => {
                    event.preventDefault();
                    edit(item.id, {
                      q: clamp(item.q - Math.sign(event.deltaY) * 0.1, 0.2, 5),
                    });
                  }}
                  onRemove={() =>
                    remove(
                      selectedIds.includes(item.id) ? selectedIds : [item.id],
                    )
                  }
                />
              </ContextMenu.Trigger>
              <ContextMenu.Content
                accessibilityLabel={`Band ${item.id} actions`}
              >
                <Menu.Item
                  onPress={() => edit(item.id, { enabled: !item.enabled })}
                >
                  {item.enabled ? 'Disable band' : 'Enable band'}
                </Menu.Item>
                <Menu.Item onPress={() => remove([item.id])}>
                  Remove band
                </Menu.Item>
              </ContextMenu.Content>
            </ContextMenu>
          ))}
        </Plot>
        <LevelMeter
          label="Output"
          value={[-18, -21]}
          min={-60}
          max={0}
          length={190}
        />
      </View>
      <Text style={textStyle(theme, 'caption', theme.color.textSecondary)}>
        Drag empty space to select · Shift adds · Ctrl/Cmd toggles
      </Text>
      <Text style={textStyle(theme, 'caption', theme.color.textSecondary)}>
        Drag a selected band to move the group · Hold Shift for fine adjustment
      </Text>
      <SelectableList
        orientation="horizontal"
        accessibilityLabel="Bands"
        multiple
        items={bands.map(({ id }) => ({ id, label: `Band ${id}` }))}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => {
          setSelection(ids);
          setEditing(ids.at(-1));
        }}
      />
      <View style={{ flexDirection: 'row', gap: theme.spacing.spaceSm }}>
        <Tooltip content="Add an editable band at 1 kHz">
          <Button onPress={() => add(1000, 0)}>Add band</Button>
        </Tooltip>
        <Button
          disabled={!selectedIds.length}
          onPress={() => remove(selectedIds)}
        >
          Remove selected
        </Button>
        <Button
          onPress={() => {
            const next = range === 12 ? 24 : 12;
            setBands((all) =>
              all.map((item) => ({ ...item, db: clamp(item.db, -next, next) })),
            );
            setRange(next);
          }}
        >
          {`Range ±${range} dB`}
        </Button>
      </View>
      <Popover open={Boolean(band)} onOpenChange={() => setEditing(undefined)}>
        <Popover.Content
          anchor={marker}
          side="bottom"
          align="center"
          autoFocus={false}
          dismissOnOutside={false}
          accessibilityLabel="Band editor"
        >
          {band && (
            <>
              <Select<Shape>
                accessibilityLabel="Filter type"
                width={128}
                value={band.shape}
                onChange={(shape) => edit(band.id, { shape })}
                options={shapes}
                iconOnly
                hideCheckmark
              />
              <ValueField
                label="Frequency"
                min={20}
                max={20000}
                scale="log"
                value={band.hz}
                format={formatters.frequency}
                onChange={(hz) => edit(band.id, { hz })}
              />
              <ValueField
                label="Gain"
                min={-range}
                max={range}
                value={band.db}
                format={formatters.decibels}
                onChange={(db) => edit(band.id, { db })}
              />
              <Knob
                label="Q"
                min={0.2}
                max={5}
                step={0.01}
                value={band.q}
                onChange={(q) => edit(band.id, { q })}
              />
              <Button onPress={() => setEditing(undefined)}>Done</Button>
            </>
          )}
        </Popover.Content>
      </Popover>
    </View>
  );
}

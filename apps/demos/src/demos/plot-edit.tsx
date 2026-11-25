import {
  Button,
  DropdownMenu,
  Menu,
  Plot,
  Popover,
  type PopupRegion,
} from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { Text, View } from '@soundor/react';
import { useRef, useState } from 'react';
import type { UiNode } from 'soundor:ui';

export default function Demo() {
  const theme = useTheme();
  const [points, setPoints] = useState<readonly (readonly [number, number])[]>([
    [0.5, 0.5],
  ]);
  const [menu, setMenu] = useState<PopupRegion | null>(null);
  const [cursor, setCursor] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const original = useRef(points);
  const [aux, setAux] = useState(1);
  const anchor = useRef<UiNode | null>(null);
  return (
    <View style={{ gap: theme.spacing.spaceSm }}>
      <Plot
        width={360}
        height={180}
        accessibilityLabel="Point editor"
        selection={{
          selectedIds,
          onSelectionChange: setSelectedIds,
          multiple: true,
          rectangle: true,
          onGroupDrag: ({ phase, delta, ids, coordinates }) => {
            if (phase === 'start') original.current = points;
            if (phase === 'cancel') setPoints(original.current);
            if (phase === 'move')
              setPoints(
                original.current.map(([x, y], index) => {
                  if (!ids.includes(String(index))) return [x, y];
                  const nx = coordinates.x.invert(
                    coordinates.x.map(x) + delta[0],
                  );
                  const ny = coordinates.y.invert(
                    coordinates.y.map(y) + delta[1],
                  );
                  return [
                    Math.min(1, Math.max(0, nx)),
                    index === 0 ? y : Math.min(1, Math.max(0, ny)),
                  ];
                }),
              );
          },
        }}
        onBackgroundDoubleClick={({ data }) =>
          setPoints((prev) => [...prev, data])
        }
        onBackgroundPointerMove={({ data: [x, y] }) =>
          setCursor(`${x.toFixed(2)}, ${y.toFixed(2)}`)
        }
        onBackgroundPointerLeave={() => setCursor('')}
        onBackgroundContextMenu={({ event }) => {
          event.preventDefault();
          setMenu({ x: event.pageX, y: event.pageY });
        }}
      >
        <Plot.XAxis domain={[0, 1]} />
        <Plot.YAxis domain={[0, 1]} />
        <Plot.Grid />
        {points.map(([x, y], index) => (
          <Plot.Marker
            key={index}
            id={String(index)}
            label={`Point ${index + 1}`}
            ref={index === selected ? anchor : undefined}
            movement={index === 0 ? 'x' : 'both'}
            hitRadius={14}
            onSelect={() => setSelected(index)}
            onWheel={(event) => {
              event.preventDefault();
              setAux((value) =>
                Math.max(0, value - Math.sign(event.deltaY) * 0.1),
              );
            }}
            x={x}
            y={y}
            onMove={(point) =>
              setPoints((prev) => prev.map((p, i) => (i === index ? point : p)))
            }
          />
        ))}
      </Plot>
      <Popover open={selected !== null} onOpenChange={() => setSelected(null)}>
        <Popover.Content
          anchor={anchor}
          side="top"
          accessibilityLabel="Point controls"
          autoFocus={false}
          dismissOnOutside={false}
        >
          <Text style={{ color: theme.color.text }}>
            Auxiliary value: {aux.toFixed(1)}
          </Text>
          <Button onPress={() => setSelected(null)}>
            Close point controls
          </Button>
        </Popover.Content>
      </Popover>
      <Text style={{ color: theme.color.textSecondary }}>
        {selectedIds.length} selected.{' '}
        {cursor || 'Double-click to add; Shift-drag to select.'}
      </Text>
      <Button onPress={() => setPoints((prev) => [...prev, [0.25, 0.75]])}>
        Add point
      </Button>
      <DropdownMenu open={menu !== null} onOpenChange={() => setMenu(null)}>
        <DropdownMenu.Content
          anchor={menu ?? undefined}
          accessibilityLabel="Graph actions"
        >
          <Menu.Item
            onPress={() => {
              setPoints([]);
              setSelected(null);
              setSelectedIds([]);
            }}
          >
            Clear points
          </Menu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </View>
  );
}

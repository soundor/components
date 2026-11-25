import {
  Button,
  DropdownMenu,
  Menu,
  Plot,
  type PopupRegion,
} from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { Text, View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const theme = useTheme();
  const [points, setPoints] = useState<readonly (readonly [number, number])[]>([
    [0.5, 0.5],
  ]);
  const [menu, setMenu] = useState<PopupRegion | null>(null);
  const [cursor, setCursor] = useState('');
  return (
    <View style={{ gap: theme.spacing.spaceSm }}>
      <Plot
        width={360}
        height={180}
        accessibilityLabel="Point editor"
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
            label={`Point ${index + 1}`}
            x={x}
            y={y}
            onMove={(point) =>
              setPoints((prev) => prev.map((p, i) => (i === index ? point : p)))
            }
          />
        ))}
      </Plot>
      <Text accessible={false} style={{ color: theme.color.textSecondary }}>
        {cursor || 'Double-click the graph to add a point'}
      </Text>
      <Button onPress={() => setPoints((prev) => [...prev, [0.25, 0.75]])}>
        Add point
      </Button>
      <DropdownMenu open={menu !== null} onOpenChange={() => setMenu(null)}>
        <DropdownMenu.Content
          anchor={menu ?? undefined}
          accessibilityLabel="Graph actions"
        >
          <Menu.Item onPress={() => setPoints([])}>Clear points</Menu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </View>
  );
}

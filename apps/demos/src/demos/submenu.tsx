import { Button, DropdownMenu, Menu } from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { Text, View, useViewSize } from '@soundor/react';
import { useState } from 'react';

const filterTypes = [
  'Bell',
  'Low Shelf',
  'High Shelf',
  'Low Cut',
  'High Cut',
  'Notch',
  'Band Pass',
] as const;
const slopes = ['6 dB/oct', '12 dB/oct', '24 dB/oct', '48 dB/oct'];
const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
// Five octaves of root notes: longer than the editor, so the submenu scrolls.
const roots = Array.from(
  { length: 60 },
  (_, i) => `${names[i % 12]}${Math.floor(i / 12) + 1}`,
);

// Rest the pointer on a row with a chevron, or press →, to open its submenu.
// On the way to it, the pointer may cross the rows below.
export default function Demo() {
  const theme = useTheme();
  // As wide as the editor, less the frame's padding: Output at its right edge.
  const view = useViewSize();
  const [type, setType] = useState<string>('Bell');
  const [slope, setSlope] = useState('12 dB/oct');
  const [root, setRoot] = useState('C3');
  const [last, setLast] = useState('Nothing yet');
  const run = (name: string) => () => setLast(name);
  return (
    <View style={{ gap: 14, width: Math.max(0, view.width - 40) }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* One level: the band menu's filter types. */}
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button>Band</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <Menu.Item onPress={run('Reset band')}>Reset</Menu.Item>
              <Menu.Sub>
                <Menu.SubTrigger>Filter type</Menu.SubTrigger>
                <Menu.SubContent>
                  {filterTypes.map((name) => (
                    <Menu.Item
                      key={name}
                      checked={name === type}
                      onPress={() => setType(name)}
                    >
                      {name}
                    </Menu.Item>
                  ))}
                </Menu.SubContent>
              </Menu.Sub>
              <Menu.Item onPress={run('Solo band')}>Solo</Menu.Item>
              <Menu.Divider />
              <Menu.Item onPress={run('Delete band')}>Delete</Menu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
          {/* Two levels: a submenu with one of its own. */}
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button>Filter</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <Menu.Sub>
                <Menu.SubTrigger>Shape</Menu.SubTrigger>
                <Menu.SubContent>
                  <Menu.Item onPress={run('Analog')}>Analog</Menu.Item>
                  <Menu.Item onPress={run('Digital')}>Digital</Menu.Item>
                  <Menu.Sub>
                    <Menu.SubTrigger>Slope</Menu.SubTrigger>
                    <Menu.SubContent>
                      {slopes.map((name) => (
                        <Menu.Item
                          key={name}
                          checked={name === slope}
                          onPress={() => setSlope(name)}
                        >
                          {name}
                        </Menu.Item>
                      ))}
                    </Menu.SubContent>
                  </Menu.Sub>
                </Menu.SubContent>
              </Menu.Sub>
              {/* A long submenu: held to the editor's height, it scrolls. */}
              <Menu.Sub>
                <Menu.SubTrigger>Key tracking root</Menu.SubTrigger>
                <Menu.SubContent>
                  {roots.map((name) => (
                    <Menu.Item
                      key={name}
                      checked={name === root}
                      onPress={() => setRoot(name)}
                    >
                      {name}
                    </Menu.Item>
                  ))}
                </Menu.SubContent>
              </Menu.Sub>
              <Menu.Item onPress={run('Bypass filter')}>Bypass</Menu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </View>
        {/* At the editor's right edge: the submenu flips to the left. */}
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button>Output</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <Menu.Sub>
              <Menu.SubTrigger>Channels</Menu.SubTrigger>
              <Menu.SubContent>
                <Menu.Item onPress={run('Stereo')}>Stereo</Menu.Item>
                <Menu.Item onPress={run('Mid/Side')}>Mid/Side</Menu.Item>
                <Menu.Item onPress={run('Mono')}>Mono</Menu.Item>
              </Menu.SubContent>
            </Menu.Sub>
            <Menu.Item onPress={run('Mute output')}>Mute</Menu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </View>
      <Text
        style={{
          fontFamily: theme.font.mono,
          fontSize: 11,
          color: theme.color.textSecondary,
        }}
      >
        Filter: {type}, {slope}, root {root} · Last action: {last}
      </Text>
    </View>
  );
}

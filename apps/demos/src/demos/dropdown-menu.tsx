import { Button, DropdownMenu, Menu } from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { Pressable, Text, View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const theme = useTheme();
  const [last, setLast] = useState('Nothing yet');
  const [snap, setSnap] = useState(true);
  const run = (name: string) => () => setLast(name);
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button>Preset</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <Menu.Item onPress={run('Save')}>Save</Menu.Item>
            <Menu.Item onPress={run('Save As')}>Save As…</Menu.Item>
            <Menu.Divider />
            <Menu.Item onPress={run('Copy')}>Copy Preset</Menu.Item>
            <Menu.Item disabled>Paste Preset</Menu.Item>
            <Menu.Divider />
            <Menu.Item onPress={run('Initialize')}>Initialize</Menu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
        {/* A trigger of your own: anything that takes onPress and a ref. */}
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Pressable
              accessibilityLabel="View options"
              style={({ hovered, focusVisible }) => ({
                width: 30,
                height: 30,
                borderRadius: theme.radius.radiusMd,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hovered ? theme.color.surface : 'transparent',
                outlineWidth: focusVisible ? theme.size.focusRing : 0,
                outlineColor: theme.color.focus,
                outlineOffset: 2,
              })}
            >
              <Text style={{ color: theme.color.textSecondary, fontSize: 16 }}>
                ⋯
              </Text>
            </Pressable>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content side="right" align="end">
            <Menu.Label>View</Menu.Label>
            <Menu.Item checked={snap} onPress={() => setSnap(!snap)}>
              Snap to grid
            </Menu.Item>
            <Menu.Item onPress={run('Zoom to fit')}>Zoom to fit</Menu.Item>
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
        Last action: {last}
      </Text>
    </View>
  );
}

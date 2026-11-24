import { Button, Dropdown } from '@soundor/components';
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
        <Dropdown
          trigger={<Button>Preset</Button>}
          items={[
            {
              id: 'save',
              label: 'Save',
              onSelect: run('Save'),
            },
            {
              id: 'save-as',
              label: 'Save As…',
              onSelect: run('Save As'),
            },
            { type: 'separator' },
            {
              id: 'copy',
              label: 'Copy Preset',
              onSelect: run('Copy'),
            },
            {
              id: 'paste',
              label: 'Paste Preset',
              disabled: true,
            },
            { type: 'separator' },
            { id: 'init', label: 'Initialize', onSelect: run('Initialize') },
          ]}
        />
        {/* A trigger of your own: anything with onPress. */}
        <Dropdown
          align="end"
          accessibilityLabel="View options"
          trigger={
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
          }
          items={[
            {
              id: 'snap',
              label: 'Snap to grid',
              checked: snap,
              onSelect: () => setSnap(!snap),
            },
            { id: 'zoom', label: 'Zoom to fit', onSelect: run('Zoom to fit') },
          ]}
        />
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

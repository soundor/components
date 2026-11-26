import { Button, Knob, Popover, Select, ValueField } from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { View } from '@soundor/react';
import { useRef, useState } from 'react';
import type { UiNode } from 'soundor:ui';

export default function Demo() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [shifted, setShifted] = useState(false);
  const anchor = useRef<UiNode | null>(null);
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.spaceMd }}>
      <Popover>
        <Popover.Trigger>
          <Button>Settings</Button>
        </Popover.Trigger>
        <Popover.Content accessibilityLabel="Settings">
          <Select
            label="Quality"
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'studio', label: 'Studio' },
            ]}
          />
          <Knob label="Drive" min={0} max={12} defaultValue={3} />
        </Popover.Content>
      </Popover>
      <Button onPress={() => setOpen(!open)}>
        {open ? 'Close editor' : 'Open editor'}
      </Button>
      <Button
        ref={anchor}
        onPress={() => setShifted(!shifted)}
        style={{ marginLeft: shifted ? theme.spacing.spaceXl * 3 : 0 }}
      >
        Move anchor
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Content
          anchor={anchor}
          side="right"
          accessibilityLabel="Floating editor"
          autoFocus={false}
          dismissOnOutside={false}
        >
          <ValueField label="Trim" min={-12} max={12} defaultValue={0} />
        </Popover.Content>
      </Popover>
    </View>
  );
}

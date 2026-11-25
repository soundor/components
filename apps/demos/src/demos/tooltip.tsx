import { Button, Knob, Tooltip } from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const theme = useTheme();
  const [drive, setDrive] = useState(3);
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.spaceMd }}>
      <Button>Before tooltip</Button>
      <Tooltip content="Includes the post-effects signal">
        <Button accessibilityLabel="Analyzer">Analyzer</Button>
      </Tooltip>
      <Tooltip content={`Drive: ${drive.toFixed(1)} dB`}>
        <Knob
          label="Drive"
          min={0}
          max={12}
          value={drive}
          onChange={setDrive}
        />
      </Tooltip>
      <Tooltip content="Select a preset before saving">
        <Button disabled>Save preset</Button>
      </Tooltip>
    </View>
  );
}

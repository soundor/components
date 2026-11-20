import { TextField } from '@soundor/components';
import { View } from '@soundor/react';

export default function Demo() {
  return (
    <View style={{ gap: 14 }}>
      <TextField label="Empty" placeholder="Type here" width={200} />
      <TextField label="Small" size="sm" defaultValue="Compact" width={200} />
      <TextField label="Large" size="lg" defaultValue="Roomy" width={200} />
      <TextField
        label="Disabled"
        defaultValue="Factory preset"
        disabled
        width={200}
      />
    </View>
  );
}

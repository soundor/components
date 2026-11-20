import { Button } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const [ready, setReady] = useState(false);
  return (
    <View style={{ gap: 14, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button disabled>Surface</Button>
        <Button variant="accent" disabled>
          Accent
        </Button>
        <Button variant="ghost" disabled>
          Ghost
        </Button>
      </View>
      {/* Available only once there is something to apply. */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button onPress={() => setReady(!ready)}>
          {ready ? 'Clear changes' : 'Make a change'}
        </Button>
        <Button variant="accent" disabled={!ready}>
          Apply
        </Button>
      </View>
    </View>
  );
}

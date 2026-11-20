import { Button } from '@soundor/components';
import { Text, View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const [count, setCount] = useState(0);
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button onPress={() => setCount(count + 1)}>Surface</Button>
        <Button variant="accent" onPress={() => setCount(count + 1)}>
          Accent
        </Button>
        <Button variant="ghost" onPress={() => setCount(0)}>
          Reset
        </Button>
      </View>
      <Text style={{ fontSize: 12 }}>Pressed {count} times</Text>
    </>
  );
}

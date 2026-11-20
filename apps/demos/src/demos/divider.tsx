import { Divider } from '@soundor/components';
import { Text, View } from '@soundor/react';

export default function Demo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Text>Left</Text>
      <Divider orientation="vertical" length={32} />
      <Text>Right</Text>
    </View>
  );
}

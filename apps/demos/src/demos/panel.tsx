import { Panel } from '@soundor/components';
import { Text, View } from '@soundor/react';

export default function Demo() {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Panel title="Surface">
        <Text style={{ fontSize: 12 }}>Surface panel</Text>
      </Panel>
      <Panel title="Display" variant="display">
        <Text style={{ fontSize: 12, color: '#acabb9' }}>Display panel</Text>
      </Panel>
    </View>
  );
}

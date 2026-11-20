import { Toggle } from '@soundor/components';
import { Text, View, useParameter } from '@soundor/react';
import { useState } from 'react';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  const bypass = useParameter(parameters.bypass);
  const [on, setOn] = useState(true);
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Toggle label="Bypass" variant="switch" parameter={parameters.bypass} />
        <Toggle label="Chip" variant="chip" value={on} onChange={setOn} />
        <Toggle label="Button" variant="button" value={on} onChange={setOn} />
      </View>
      <Text style={{ fontSize: 12 }}>Bypass is {bypass ? 'on' : 'off'}</Text>
    </>
  );
}

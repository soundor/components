import { ValueField, formatters, parsers } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const [time, setTime] = useState(1500);
  return (
    <View>
      <ValueField
        label="Time"
        min={1}
        max={2000}
        value={time}
        onChange={setTime}
        format={formatters.time}
        parse={parsers.number}
        width={88}
      />
    </View>
  );
}

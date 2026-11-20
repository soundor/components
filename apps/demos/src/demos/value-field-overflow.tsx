import { Slider, ValueField, formatters, parsers } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const [hz, setHz] = useState(20_000);
  // Sweep the value across its range. The longest text, "20.0 kHz", is 56 px
  // wide in the default type: with the field's padding and border, 76 fits
  // every value, and 56 does not.
  const field = { value: hz, onChange: setHz, min: 20, max: 20_000 };
  return (
    <View style={{ gap: 16, alignItems: 'center' }}>
      <Slider
        label="Sweep"
        scale="log"
        format={formatters.frequency}
        width={260}
        {...field}
      />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <ValueField
          label="56 px"
          scale="log"
          format={formatters.frequency}
          parse={parsers.number}
          width={56}
          {...field}
        />
        <ValueField
          label="76 px"
          scale="log"
          format={formatters.frequency}
          parse={parsers.number}
          width={76}
          {...field}
        />
      </View>
    </View>
  );
}

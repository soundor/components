import { Knob, formatters } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  const [feedback, setFeedback] = useState(0.4);
  return (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      <Knob
        parameter={parameters.feedback}
        size="lg"
        format={formatters.percent}
      />
      <Knob
        label="Standalone"
        value={feedback}
        onChange={setFeedback}
        format={formatters.percent}
      />
    </View>
  );
}

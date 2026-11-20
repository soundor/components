import { ValueField } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [voices, setVoices] = useState(8);
  // No unit and no prefix: `format` returns the number alone.
  return (
    <ValueField
      label="Voices"
      min={1}
      max={16}
      step={1}
      value={voices}
      onChange={setVoices}
      format={(value) => String(Math.round(value))}
      width={64}
    />
  );
}

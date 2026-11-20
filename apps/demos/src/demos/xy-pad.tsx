import { XYPad } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.3);
  return (
    <XYPad
      title="Filter"
      x={{ label: 'Cutoff', value: x, onChange: setX }}
      y={{ label: 'Resonance', value: y, onChange: setY }}
      width={220}
      height={150}
    />
  );
}

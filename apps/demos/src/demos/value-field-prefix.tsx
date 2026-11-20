import { ValueField, formatters, parsers } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [pan, setPan] = useState(-0.3);
  // `formatters.pan` gives "L 30", "C" or "R 30": the letter is the prefix.
  // Only "30" is selected, so typing 20 keeps the L, and typing "R 20" changes
  // it: `parsers.pan` reads "L30", "r 12" or "-40".
  return (
    <ValueField
      label="Pan"
      min={-1}
      max={1}
      value={pan}
      onChange={setPan}
      format={formatters.pan}
      parse={parsers.pan}
      width={72}
    />
  );
}

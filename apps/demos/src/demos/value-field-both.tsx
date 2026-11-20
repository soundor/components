import { ValueField } from '@soundor/components';
import { useState } from 'react';

// "BW 1.50 oct": "BW " is the prefix, " oct" the suffix. Only the number is
// selected for typing, and a bare number keeps both.
const format = (octaves: number) => `BW ${octaves.toFixed(2)} oct`;

// Read the number out of whatever was typed, with or without the words.
function parse(text: string) {
  const found = /[+\-−]?\d+(?:[.,]\d+)?|[.,]\d+/.exec(text);
  if (!found) return null;
  const value = Number(found[0].replace(',', '.').replace('−', '-'));
  return Number.isFinite(value) ? value : null;
}

export default function Demo() {
  const [width, setWidth] = useState(1.5);
  return (
    <ValueField
      label="Bandwidth"
      min={0.1}
      max={4}
      value={width}
      onChange={setWidth}
      format={format}
      parse={parse}
      width={104}
    />
  );
}

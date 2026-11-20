import { TextField } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [name, setName] = useState('Warm Pad');
  return (
    <TextField
      label="Preset name"
      value={name}
      onChange={setName}
      placeholder="Untitled"
      width={200}
    />
  );
}

import { TextField } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [name, setName] = useState('Warm/Pad');
  // Validation is yours: say what is wrong, and the field shows it.
  const error = /[\\/:*?"<>|]/.test(name)
    ? 'Names cannot contain / \\ : * ? " < > |'
    : undefined;
  return (
    <TextField
      label="File name"
      value={name}
      onChange={setName}
      description="Used when the preset is exported."
      error={error}
      width={220}
    />
  );
}

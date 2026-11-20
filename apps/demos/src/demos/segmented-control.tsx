import { SegmentedControl } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [mode, setMode] = useState<'sync' | 'free'>('sync');
  return (
    <SegmentedControl
      label="Mode"
      options={[
        { value: 'sync', label: 'Sync' },
        { value: 'free', label: 'Free' },
      ]}
      value={mode}
      onChange={setMode}
    />
  );
}

import { SelectableList } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [ids, select] = useState<readonly string[]>(['one']);
  return (
    <SelectableList
      orientation="horizontal"
      accessibilityLabel="Modulation sources"
      selectionMode="extended"
      items={[
        { id: 'one', label: 'LFO 1' },
        { id: 'two', label: 'LFO 2' },
        { id: 'env', label: 'Envelope', disabled: true },
        { id: 'three', label: 'LFO 3' },
      ]}
      selectedIds={ids}
      onSelectionChange={select}
    />
  );
}

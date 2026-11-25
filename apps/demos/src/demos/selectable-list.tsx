import { SelectableList } from '@soundor/components';
import { useState } from 'react';

export default function Demo() {
  const [ids, select] = useState<readonly string[]>(['one']);
  return (
    <SelectableList
      orientation="horizontal"
      accessibilityLabel="Modulation sources"
      multiple
      items={[
        { id: 'one', label: 'LFO 1' },
        { id: 'two', label: 'LFO 2' },
        { id: 'env', label: 'Envelope', disabled: true },
      ]}
      selectedIds={ids}
      onSelectionChange={select}
    />
  );
}

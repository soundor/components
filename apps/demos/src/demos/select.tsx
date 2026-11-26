import { Select } from '@soundor/components';
import { View } from '@soundor/react';
import { useState } from 'react';
import { parameters } from 'soundor:parameters';

import { FilterIcon } from '../filter-icon';

type Oversampling = '1' | '2' | '4' | '8' | '16';

export default function Demo() {
  const [oversampling, setOversampling] = useState<Oversampling>('2');
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
      {/* Bound: the options, the label and the value are the parameter's. */}
      <Select
        parameter={parameters.filterType}
        hideCheckmark
        width={128}
        options={parameters.filterType.info.options.map(({ value }) => ({
          value,
          icon: ({ color }) => <FilterIcon shape={value} color={color} />,
        }))}
      />
      <Select
        label="Oversampling"
        description="Higher costs more CPU"
        width={120}
        value={oversampling}
        onChange={setOversampling}
        options={[
          { value: '1', label: 'Off' },
          { value: '2', label: '2×' },
          { value: '4', label: '4×' },
          { value: '8', label: '8×' },
          { value: '16', label: '16×', disabled: true, hint: 'Offline only' },
        ]}
      />
    </View>
  );
}

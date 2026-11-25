import { Select } from '@soundor/components';
import { textStyle, useTheme } from '@soundor/components/theme';
import { Text, View } from '@soundor/react';
import { useState } from 'react';
import { parameters } from 'soundor:parameters';

type Oversampling = '1' | '2' | '4' | '8' | '16';

export default function Demo() {
  const theme = useTheme();
  const [oversampling, setOversampling] = useState<Oversampling>('2');
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
      {/* Bound: the options, the label and the value are the parameter's. */}
      <Select
        parameter={parameters.filterType}
        iconOnly
        width={104}
        getOptionIcon={(option) => (
          <Text accessible={false} style={textStyle(theme, 'body')}>
            {option.label.toLowerCase().includes('low')
              ? '⌝'
              : option.label.toLowerCase().includes('high')
                ? '⌞'
                : '⌒'}
          </Text>
        )}
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

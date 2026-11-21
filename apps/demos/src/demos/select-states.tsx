import { Select, type SelectOption } from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { Text, View } from '@soundor/react';
import { Path, Svg } from '@soundor/react/svg';

type Wave = 'sine' | 'triangle' | 'saw' | 'square' | 'noise';

const waves: SelectOption<Wave>[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'saw', label: 'Saw' },
  { value: 'square', label: 'Square' },
  {
    value: 'noise',
    label: 'Noise',
    disabled: true,
    hint: 'In the full version',
  },
];

const shapes: Record<Wave, string> = {
  sine: 'M1 6 C3 0 5 0 7 6 S11 12 13 6',
  triangle: 'M1 6 L4 1 L10 11 L13 6',
  saw: 'M1 10 L7 2 L7 10 L13 2',
  square: 'M1 10 L1 2 L7 2 L7 10 L13 10 L13 2',
  noise: 'M1 6 L3 2 L4 9 L6 3 L8 10 L10 1 L13 7',
};

export default function Demo() {
  const theme = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        <Select
          label="Routing"
          placeholder="Choose a routing…"
          width={150}
          options={[
            { value: 'serial', label: 'Serial' },
            { value: 'parallel', label: 'Parallel' },
            { value: 'split', label: 'Mid/Side split' },
          ]}
        />
        {/* Each option drawn with an icon of its own. */}
        <Select
          label="Waveform"
          options={waves}
          defaultValue="saw"
          width={140}
          renderOption={(option, { active, disabled }) => {
            const color = disabled
              ? theme.color.textDisabled
              : active
                ? theme.color.selectedForeground
                : theme.color.text;
            return (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Svg width={14} height={12} viewBox={[0, 0, 14, 12]}>
                  <Path
                    d={shapes[option.value]}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.4}
                  />
                </Svg>
                <Text
                  style={{ fontFamily: theme.font.sans, fontSize: 11, color }}
                >
                  {option.label}
                </Text>
              </View>
            );
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
        <Select
          label="Small"
          size="sm"
          width={90}
          options={waves}
          defaultValue="sine"
        />
        <Select
          label="Read-only"
          readOnly
          width={110}
          options={waves}
          defaultValue="square"
        />
        <Select
          label="Disabled"
          disabled
          width={110}
          options={waves}
          defaultValue="triangle"
        />
        <Select
          label="Large"
          size="lg"
          width={120}
          options={waves}
          defaultValue="saw"
        />
      </View>
    </View>
  );
}

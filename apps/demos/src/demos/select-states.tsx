import { Select, type SelectOption } from '@soundor/components';
import {
  WaveSawtooth,
  WaveSine,
  WaveSquare,
  WaveTriangle,
  Waveform,
} from '@soundor/icons/phosphor';
import { View } from '@soundor/react';

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

const icons = {
  sine: WaveSine,
  triangle: WaveTriangle,
  saw: WaveSawtooth,
  square: WaveSquare,
  noise: Waveform,
} satisfies Record<Wave, typeof WaveSine>;

const visualWaves: SelectOption<Wave>[] = waves.map((option) => {
  const Icon = icons[option.value];
  return { ...option, icon: ({ color }) => <Icon size={16} color={color} /> };
});

export default function Demo() {
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
          options={visualWaves}
          hideCheckmark
          defaultValue="saw"
          width={140}
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

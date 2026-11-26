import {
  Fader,
  Knob,
  SegmentedControl,
  Select,
  Slider,
  Toggle,
  ValueField,
} from '@soundor/components';
import { textStyle, useTheme } from '@soundor/components/theme';
import { Text, View } from '@soundor/react';
import { useState, type ReactNode } from 'react';

type ExampleProps<T> = {
  value: T;
  mixed: boolean;
  onChange: (value: T) => void;
};

function Example<T>({
  initial,
  mixed: initiallyMixed,
  children,
}: {
  initial: T;
  mixed: boolean;
  children: (props: ExampleProps<T>) => ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const [mixed, setMixed] = useState(initiallyMixed);
  return (
    <View style={{ flex: 1 }}>
      {children({
        value,
        mixed,
        onChange(next) {
          setValue(next);
          setMixed(false);
        },
      })}
    </View>
  );
}

function Pair<T>({
  initial,
  children,
}: {
  initial: T;
  children: (props: ExampleProps<T>) => ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.spaceLg }}>
      <Example initial={initial} mixed={false}>
        {children}
      </Example>
      <Example initial={initial} mixed>
        {children}
      </Example>
    </View>
  );
}

const options = [
  { value: 'bell', label: 'Bell' },
  { value: 'shelf', label: 'Shelf' },
];

export default function Demo() {
  const theme = useTheme();
  const heading = textStyle(theme, 'technical');
  const numeric = { max: 100, defaultValue: 25 };
  return (
    <View style={{ gap: theme.spacing.spaceLg, width: 360, maxWidth: '100%' }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.spaceLg }}>
        <Text style={{ ...heading, flex: 1 }}>Normal</Text>
        <Text style={{ ...heading, flex: 1 }}>Mixed</Text>
      </View>
      <Pair initial={75}>
        {(props) => <ValueField {...numeric} {...props} label="Value field" />}
      </Pair>
      <Pair initial={75}>
        {(props) => <Knob {...numeric} {...props} label="Knob" />}
      </Pair>
      <Pair initial={75}>
        {(props) => <Slider {...numeric} {...props} label="Slider" />}
      </Pair>
      <Pair initial={75}>
        {(props) => (
          <Fader {...numeric} {...props} label="Fader" length={100} />
        )}
      </Pair>
      <Pair initial={true}>
        {(props) => <Toggle {...props} label="Button" />}
      </Pair>
      <Pair initial={true}>
        {(props) => <Toggle {...props} label="Chip" variant="chip" />}
      </Pair>
      <Pair initial={true}>
        {(props) => <Toggle {...props} label="Switch" variant="switch" />}
      </Pair>
      <Pair initial="bell">
        {(props) => (
          <SegmentedControl {...props} label="Shape" options={options} />
        )}
      </Pair>
      <Pair initial="bell">
        {(props) => (
          <Select
            {...props}
            label="Filter type"
            width={130}
            options={options}
          />
        )}
      </Pair>
    </View>
  );
}

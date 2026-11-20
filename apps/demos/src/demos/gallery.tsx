import {
  ControlGroup,
  Fader,
  Knob,
  SegmentedControl,
  Toggle,
  ValueField,
  formatters,
  parsers,
} from '@soundor/components';
import { View } from '@soundor/react';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  return (
    <>
      <ControlGroup title="Delay" direction="row" dividers>
        <Knob parameter={parameters.feedback} />
        <Knob label="Mix" parameter={parameters.mix} />
        <Fader parameter={parameters.gain} length={110} />
      </ControlGroup>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <SegmentedControl<'sync' | 'free'>
          label="Mode"
          parameter={parameters.mode}
        />
        <Toggle label="Bypass" variant="switch" parameter={parameters.bypass} />
        <ValueField
          parameter={parameters.time}
          format={formatters.time}
          parse={parsers.number}
          width={80}
        />
      </View>
    </>
  );
}

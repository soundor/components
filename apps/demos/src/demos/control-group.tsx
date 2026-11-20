import { ControlGroup, Knob, Slider, Toggle } from '@soundor/components';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  return (
    <ControlGroup title="Delay" direction="row" dividers>
      <Knob parameter={parameters.feedback} />
      <Slider parameter={parameters.mix} width={120} />
      <Toggle label="Bypass" variant="switch" parameter={parameters.bypass} />
    </ControlGroup>
  );
}

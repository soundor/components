import { Slider } from '@soundor/components';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  return <Slider parameter={parameters.mix} width={220} />;
}

import { Fader } from '@soundor/components';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  return (
    <Fader parameter={parameters.gain} ticks={[-24, -12, 0, 6]} length={150} />
  );
}

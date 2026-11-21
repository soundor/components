import { EnvelopeEditor } from '@soundor/components';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  return (
    <EnvelopeEditor
      title="Amp envelope"
      parameters={{
        attack: parameters.attack,
        decay: parameters.decay,
        sustain: parameters.sustain,
        release: parameters.release,
      }}
    />
  );
}

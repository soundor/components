// A synth voice's panel: how the new controls sit in a plugin.
import {
  ContextMenu,
  ControlGroup,
  Dropdown,
  EnvelopeEditor,
  Button,
  Knob,
  Panel,
  Select,
  parameterMenuItems,
} from '@soundor/components';
import { View } from '@soundor/react';
import { parameters } from 'soundor:parameters';

export default function Demo() {
  return (
    <Panel
      title="Voice"
      indicator
      trailing={
        <Dropdown
          align="end"
          trigger={
            <Button size="sm" variant="ghost">
              Options
            </Button>
          }
          items={[
            { id: 'copy', label: 'Copy Voice', shortcut: 'Mod+C' },
            { id: 'paste', label: 'Paste Voice', shortcut: 'Mod+V' },
            { type: 'separator' },
            { id: 'init', label: 'Initialize Voice' },
          ]}
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <View style={{ gap: 14 }}>
          <Select parameter={parameters.filterType} width={130} />
          <ControlGroup title="Filter" direction="row">
            <ContextMenu items={() => parameterMenuItems(parameters.feedback)}>
              <Knob parameter={parameters.feedback} label="Reso" size="sm" />
            </ContextMenu>
            <ContextMenu items={() => parameterMenuItems(parameters.mix)}>
              <Knob
                parameter={parameters.mix}
                label="Drive"
                size="sm"
                color="lavender"
              />
            </ContextMenu>
          </ControlGroup>
        </View>
        <EnvelopeEditor
          width={360}
          height={170}
          title="Amp envelope"
          parameters={{
            attack: parameters.attack,
            decay: parameters.decay,
            sustain: parameters.sustain,
            release: parameters.release,
          }}
        />
      </View>
    </Panel>
  );
}

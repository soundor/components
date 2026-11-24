// A synth voice's panel: how the new controls sit in a plugin.
import {
  ContextMenu,
  ControlGroup,
  DropdownMenu,
  EnvelopeEditor,
  Button,
  Knob,
  Menu,
  Panel,
  ParameterMenuItems,
  Select,
  type HostProps,
  type RangeParameter,
} from '@soundor/components';
import { View } from '@soundor/react';
import type { ReactElement } from 'react';
import { parameters } from 'soundor:parameters';

function WithMenu({
  parameter,
  children,
}: {
  parameter: RangeParameter;
  children: ReactElement<HostProps>;
}) {
  return (
    <ContextMenu>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Content>
        <ParameterMenuItems parameter={parameter} />
      </ContextMenu.Content>
    </ContextMenu>
  );
}

export default function Demo() {
  return (
    <Panel
      title="Voice"
      indicator
      trailing={
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button size="sm" variant="ghost">
              Options
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <Menu.Item>Copy Voice</Menu.Item>
            <Menu.Item>Paste Voice</Menu.Item>
            <Menu.Divider />
            <Menu.Item>Initialize Voice</Menu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      }
    >
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <View style={{ gap: 14 }}>
          <Select parameter={parameters.filterType} width={130} />
          <ControlGroup title="Filter" direction="row">
            <WithMenu parameter={parameters.feedback}>
              <Knob parameter={parameters.feedback} label="Reso" size="sm" />
            </WithMenu>
            <WithMenu parameter={parameters.mix}>
              <Knob
                parameter={parameters.mix}
                label="Drive"
                size="sm"
                color="lavender"
              />
            </WithMenu>
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

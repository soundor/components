import {
  ContextMenu,
  ControlGroup,
  Fader,
  Knob,
  ParameterMenuItems,
  Slider,
  TextField,
  type HostProps,
  type RangeParameter,
} from '@soundor/components';
import { Modal, View } from '@soundor/react';
import { useState, type ReactElement } from 'react';
import { parameters } from 'soundor:parameters';

// Right-click a control (or focus it and press Shift+F10) for its menu.
export default function Demo() {
  const [editing, setEditing] = useState<RangeParameter | null>(null);
  const [error, setError] = useState<string | undefined>();
  // One component for each control's menu: the trigger and its items.
  const withMenu = (
    parameter: RangeParameter,
    control: ReactElement<HostProps>,
  ) => (
    <ContextMenu>
      <ContextMenu.Trigger>{control}</ContextMenu.Trigger>
      <ContextMenu.Content>
        <ParameterMenuItems
          parameter={parameter}
          onEnterValue={() => setEditing(parameter)}
        />
      </ContextMenu.Content>
    </ContextMenu>
  );
  return (
    <>
      <ControlGroup title="Delay" direction="row" dividers>
        {withMenu(
          parameters.feedback,
          <Knob parameter={parameters.feedback} />,
        )}
        {withMenu(parameters.mix, <Slider parameter={parameters.mix} />)}
        {withMenu(
          parameters.gain,
          <Fader parameter={parameters.gain} length={110} />,
        )}
      </ControlGroup>
      <Modal
        visible={editing !== null}
        onRequestClose={() => setEditing(null)}
        accessibilityLabel="Enter a value"
        backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
      >
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          {editing && (
            <View
              style={{
                padding: 16,
                borderRadius: 8,
                backgroundColor: '#f3f4ee',
              }}
            >
              <TextField
                label={editing.info.label}
                defaultValue={editing.format(editing.get())}
                error={error}
                description="Enter to apply, Esc to cancel"
                onChange={() => setError(undefined)}
                onSubmit={(text) => {
                  const value = editing.parse(text);
                  if (value === null) return setError('Not a value');
                  editing.beginGesture({ history: true });
                  editing.set(value);
                  editing.endGesture();
                  setEditing(null);
                }}
              />
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

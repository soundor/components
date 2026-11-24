import { clipboard } from 'soundor:ui';

import type { RangeParameter } from '../../internal/range';
import { Menu } from '../menu/menu';

export interface ParameterMenuItemsProps {
  /** The parameter the items act on: the control's. */
  parameter: RangeParameter;
  /**
   * Offers "Enter value…", which calls this: open a field of your own for the
   * value, such as a ValueField in a Modal.
   */
  onEnterValue?: () => void;
  /**
   * Offers "Copy value" and "Paste value" through the system clipboard,
   * where the runtime has one: true by default. The text is the parameter's
   * own `format()`, read back with its `parse()`.
   */
  clipboard?: boolean;
  /** The items' labels, in your language. */
  labels?: {
    reset?: string;
    enter?: string;
    copy?: string;
    paste?: string;
  };
}

function hasClipboard() {
  return (
    typeof clipboard === 'object' &&
    clipboard !== null &&
    typeof clipboard.readText === 'function' &&
    typeof clipboard.writeText === 'function'
  );
}

/**
 * Sets a value as a control's double-click reset does: one host gesture, one
 * undo step, nothing written when the value is already there.
 */
function edit(parameter: RangeParameter, value: number) {
  if (parameter.info.access === 'readOnly' || !Number.isFinite(value)) return;
  if (value === parameter.get()) return;
  parameter.beginGesture({ history: true });
  try {
    parameter.set(value);
  } finally {
    parameter.endGesture();
  }
}

/**
 * The usual items of a parameter's context menu (reset to its default,
 * type a value, copy and paste), for a ContextMenu around the control it is
 * bound to. They show the parameter's state as the menu opens:
 *
 *   <ContextMenu>
 *     <ContextMenu.Trigger>
 *       <Knob parameter={parameters.gain} />
 *     </ContextMenu.Trigger>
 *     <ContextMenu.Content>
 *       <ParameterMenuItems parameter={parameters.gain} />
 *     </ContextMenu.Content>
 *   </ContextMenu>
 *
 * Put `Menu.Item`s of your own before or after them. A read-only
 * parameter's items are disabled, but for Copy.
 */
export function ParameterMenuItems({
  parameter,
  onEnterValue,
  clipboard: offerClipboard = true,
  labels = {},
}: ParameterMenuItemsProps) {
  const readOnly = parameter.info.access === 'readOnly';
  return (
    <>
      <Menu.Item
        hint={parameter.format(parameter.info.default)}
        disabled={readOnly || parameter.get() === parameter.info.default}
        onPress={() => edit(parameter, parameter.info.default)}
      >
        {labels.reset ?? 'Reset to default'}
      </Menu.Item>
      {onEnterValue && (
        <Menu.Item disabled={readOnly} onPress={onEnterValue}>
          {labels.enter ?? 'Enter value…'}
        </Menu.Item>
      )}
      {offerClipboard && hasClipboard() && (
        <>
          <Menu.Divider />
          <Menu.Item
            // A clipboard the platform refuses: nothing is copied.
            onPress={() =>
              void clipboard
                .writeText(parameter.format(parameter.get()))
                .catch(() => {})
            }
          >
            {labels.copy ?? 'Copy value'}
          </Menu.Item>
          <Menu.Item
            disabled={readOnly}
            onPress={() =>
              void clipboard.readText().then(
                (text) => {
                  const value = parameter.parse(text.trim());
                  if (value !== null) edit(parameter, value);
                },
                () => {},
              )
            }
          >
            {labels.paste ?? 'Paste value'}
          </Menu.Item>
        </>
      )}
    </>
  );
}

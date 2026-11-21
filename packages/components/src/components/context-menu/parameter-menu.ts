import { clipboard } from 'soundor:ui';

import type { RangeParameter } from '../../internal/range';
import type { MenuItem } from '../menu/types';

export interface ParameterMenuOptions {
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
 * bound to. Call it when the menu opens, to show the parameter's state then:
 *
 *   <ContextMenu items={() => parameterMenuItems(parameters.gain)}>
 *     <Knob parameter={parameters.gain} />
 *   </ContextMenu>
 *
 * Spread the result into a list of your own to add items. A read-only
 * parameter's items are disabled, but for Copy.
 */
export function parameterMenuItems(
  parameter: RangeParameter,
  options: ParameterMenuOptions = {},
): MenuItem[] {
  const readOnly = parameter.info.access === 'readOnly';
  const labels = options.labels ?? {};
  const items: MenuItem[] = [
    {
      id: 'reset',
      label: labels.reset ?? 'Reset to default',
      hint: parameter.format(parameter.info.default),
      disabled: readOnly || parameter.get() === parameter.info.default,
      onSelect: () => edit(parameter, parameter.info.default),
    },
  ];
  if (options.onEnterValue) {
    items.push({
      id: 'enter',
      label: labels.enter ?? 'Enter value…',
      disabled: readOnly,
      onSelect: options.onEnterValue,
    });
  }
  if (options.clipboard !== false && hasClipboard()) {
    items.push(
      { type: 'separator', id: 'clipboard' },
      {
        id: 'copy',
        label: labels.copy ?? 'Copy value',
        // A clipboard the platform refuses: nothing is copied.
        onSelect: () =>
          void clipboard
            .writeText(parameter.format(parameter.get()))
            .catch(() => {}),
      },
      {
        id: 'paste',
        label: labels.paste ?? 'Paste value',
        disabled: readOnly,
        onSelect: () =>
          void clipboard.readText().then(
            (text) => {
              const value = parameter.parse(text.trim());
              if (value !== null) edit(parameter, value);
            },
            () => {},
          ),
      },
    );
  }
  return items;
}

import {
  render,
  screen,
  userEvent,
  type NodeTarget,
} from '@soundor/testing-library/react';
import { createRef, type ReactElement, type Ref } from 'react';
import type { AccessibilityAction, UiNode } from 'soundor:ui';
import { describe, expect, test, vi } from 'vitest';

import {
  Button,
  Fader,
  Knob,
  SegmentedControl,
  Select,
  Slider,
  TextField,
  Toggle,
  ValueField,
  XYPad,
} from '../index';
import { parameter } from '../test-utils';

const learn: AccessibilityAction = { name: 'learn', label: 'MIDI learn' };
const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

interface Host {
  ref: Ref<UiNode>;
  accessibilityActions: readonly AccessibilityAction[];
  onAccessibilityAction: (event: { actionName: string }) => void;
}

/** Each control, given a ref and an action, and the node a screen reader is on. */
const controls: [string, (host: Host) => ReactElement, string][] = [
  ['Button', (host) => <Button {...host}>Save</Button>, 'button'],
  ['Toggle', (host) => <Toggle {...host} label="Bypass" />, 'togglebutton'],
  ['Knob', (host) => <Knob {...host} parameter={parameter()} />, 'adjustable'],
  [
    'Slider',
    (host) => <Slider {...host} parameter={parameter()} />,
    'adjustable',
  ],
  [
    'Fader',
    (host) => <Fader {...host} parameter={parameter()} />,
    'adjustable',
  ],
  [
    'ValueField',
    (host) => <ValueField {...host} parameter={parameter()} />,
    'adjustable',
  ],
  [
    'XYPad',
    (host) => <XYPad {...host} x={{ label: 'X' }} y={{ label: 'Y' }} />,
    'adjustable',
  ],
  [
    'Select',
    (host) => <Select {...host} label="Mode" options={options} />,
    'combobox',
  ],
  ['TextField', (host) => <TextField {...host} label="Name" />, 'text'],
];

describe('controls take a ref and accessibility actions of yours', () => {
  test.each(controls)('%s', async (_, make, role) => {
    const ref = createRef<UiNode>();
    const onAccessibilityAction = vi.fn();
    await render(
      make({ ref, accessibilityActions: [learn], onAccessibilityAction }),
    );
    const node = ref.current;
    expect(node).not.toBeNull();
    const target = node as unknown as NodeTarget;
    const user = userEvent.setup();
    // The ref is the node a screen reader is on, and it offers the action
    // after the control's own.
    if (role !== 'text')
      expect(screen.getByRole(role as 'button')).toBe(node as unknown);
    const names = (
      node as unknown as { accessibility: { actions?: AccessibilityAction[] } }
    ).accessibility.actions?.map((action) => action.name);
    expect(names?.at(-1)).toBe('learn');
    await user.accessibilityAction(target, 'learn');
    expect(onAccessibilityAction).toHaveBeenCalledTimes(1);
    // One of the control's own is not passed on.
    const own = names?.[0];
    if (own && own !== 'learn') {
      await user.accessibilityAction(target, own);
      expect(onAccessibilityAction).toHaveBeenCalledTimes(1);
    }
  });

  test('SegmentedControl: the ref is the group; each option offers the action', async () => {
    const ref = createRef<UiNode>();
    const onAccessibilityAction = vi.fn();
    await render(
      <SegmentedControl
        ref={ref}
        label="Mode"
        options={options}
        accessibilityActions={[learn]}
        onAccessibilityAction={onAccessibilityAction}
      />,
    );
    expect(ref.current).toBe(
      screen.getByRole('radiogroup', { name: 'Mode' }) as unknown,
    );
    const radio = screen.getByRole('radio', { name: 'B' });
    expect(radio.accessibility.actions?.at(-1)?.name).toBe('learn');
    await userEvent.setup().accessibilityAction(radio, 'learn');
    expect(onAccessibilityAction).toHaveBeenCalledTimes(1);
  });
});

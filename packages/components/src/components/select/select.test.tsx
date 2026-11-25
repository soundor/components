import { Text } from '@soundor/react';
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@soundor/testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { Select } from '../../index';
import { choice } from '../../test-utils';
import { tokens } from '../../theme/tokens';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const filters = [
  { value: 'lowpass', label: 'Low Pass' },
  { value: 'highpass', label: 'High Pass' },
  { value: 'bandpass', label: 'Band Pass', disabled: true },
  { value: 'notch', label: 'Notch' },
  { value: 'peak', label: 'Peak' },
] as const;

type Filter = (typeof filters)[number]['value'];

type TestNode = ReturnType<typeof screen.getByRole>;

/** The transparent layer under a popup that a press outside it lands on. */
function backdropOf(menu: TestNode) {
  // The list, in its scroll frame, in the popup's surface: the backdrop is
  // the surface's sibling.
  return menu.parent!.parent!.previousSibling!;
}

/** A press outside the popup, released. */
async function pressOutside(menu: TestNode) {
  await userEvent.setup().click(backdropOf(menu));
}

describe('Select', () => {
  test('icon-only changes presentation but keeps the chosen option accessible', async () => {
    await render(
      <Select
        label="Filter"
        iconOnly
        options={filters}
        getOptionIcon={(option) => <Text>{`Shape: ${option.value}`}</Text>}
      />,
    );
    const user = userEvent.setup();
    const control = screen.getByRole('combobox', { name: 'Filter' });
    expect(control.accessibility.value?.text).toBe('Low Pass');
    await user.click(control);
    await user.click(screen.getByRole('menuitem', { name: 'High Pass' }));
    expect(control.accessibility.value?.text).toBe('High Pass');
    expect(control.focused).toBe(true);
  });
  test('opens with a click, chooses with the keyboard skipping disabled options, and gives focus back', async () => {
    const onChange = vi.fn<(value: Filter) => void>();
    await render(
      <Select
        label="Filter Type"
        options={filters}
        defaultValue="highpass"
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    const field = screen.getByRole('combobox', { name: 'Filter Type' });
    expect(field.accessibility.value?.text).toBe('High Pass');
    expect(field.accessibility.state?.expanded).toBe(false);

    await user.click(field);
    expect(field.accessibility.state?.expanded).toBe(true);
    const menu = screen.getByRole('menu', { name: 'Filter Type' });
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.accessibility.label)).toEqual([
      'Low Pass',
      'High Pass',
      'Band Pass',
      'Notch',
      'Peak',
    ]);
    // The chosen option has focus, and its tick, and is highlighted from
    // the start: the first focus comes before its pressable is attached.
    expect(items[1]!.focused).toBe(true);
    expect(items[1]!.accessibility.state?.checked).toBe(true);
    expect(items[1]!.style.backgroundColor).toBe(tokens.color.selected);
    expect(items[0]!.style.backgroundColor).toBe('transparent');
    expect(items[2]!.accessibility.state?.disabled).toBe(true);

    await user.keyboard('{ArrowDown}');
    expect(items[3]!.focused).toBe(true);
    await user.keyboard('{ArrowUp}');
    expect(items[1]!.focused).toBe(true);
    await user.keyboard('{End}');
    expect(items[4]!.focused).toBe(true);
    // Wraps at the ends.
    await user.keyboard('{ArrowDown}');
    expect(items[0]!.focused).toBe(true);
    await user.keyboard('{Home}{ArrowDown}{ArrowDown}');
    expect(items[3]!.focused).toBe(true);
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledExactlyOnceWith('notch');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(field.focused).toBe(true);
    expect(field.accessibility.value?.text).toBe('Notch');
  });

  test('a bound choice parameter supplies options and label, and choosing the current value writes nothing', async () => {
    const parameter = choice(
      [
        { value: 'sine', label: 'Sine' },
        { value: 'saw', label: 'Saw' },
        { value: 'square', label: 'Square' },
      ],
      'saw',
    );
    await render(<Select parameter={parameter} />);
    const user = userEvent.setup();
    const field = screen.getByRole('combobox', { name: 'Filter Type' });
    expect(field.accessibility.value?.text).toBe('Saw');

    await user.click(field);
    await user.click(screen.getByRole('menuitem', { name: 'Saw' }));
    expect(parameter.set).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();

    await user.click(field);
    await user.click(screen.getByRole('menuitem', { name: 'Square' }));
    expect(parameter.set).toHaveBeenCalledExactlyOnceWith('square', {
      history: true,
    });
    expect(field.accessibility.value?.text).toBe('Square');

    // The host automates it: the field follows.
    await act(() => parameter.set('sine'));
    expect(field.accessibility.value?.text).toBe('Sine');
  });

  test('a read-only parameter shows its value but does not open; disabled is not focusable', async () => {
    const parameter = choice(
      [
        { value: 'x1', label: '1×' },
        { value: 'x2', label: '2×' },
      ],
      'x2',
      'readOnly',
    );
    await render(
      <>
        <Select parameter={parameter} label="Oversampling" />
        <Select label="Routing" options={filters} disabled />
      </>,
    );
    const user = userEvent.setup();
    const readOnly = screen.getByRole('combobox', { name: 'Oversampling' });
    expect(readOnly.focusable).toBe(true);
    expect(readOnly.accessibility.hint).toBe('Read only');
    await user.click(readOnly);
    await user.keyboard('{ArrowDown}');
    expect(screen.queryByRole('menu')).toBeNull();

    const disabled = screen.getByRole('combobox', { name: 'Routing' });
    expect(disabled.focusable).toBe(false);
    await user.click(disabled);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('arrow keys open it, Escape and a press outside close it without a change, and focus comes back each time', async () => {
    const onChange = vi.fn<(value: Filter) => void>();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    await render(
      <Select
        label="Filter Type"
        placeholder="Choose…"
        options={filters}
        onChange={onChange}
        onOpenChange={onOpenChange}
      />,
    );
    const user = userEvent.setup();
    const field = screen.getByRole('combobox', { name: 'Filter Type' });
    // Nothing chosen: the placeholder.
    expect(field.accessibility.value?.text).toBe('Choose…');

    for (let round = 0; round < 3; round++) {
      field.focus();
      await user.keyboard('{ArrowDown}');
      const menu = screen.getByRole('menu');
      // No chosen option: the first enabled one has focus.
      expect(
        within(menu).getByRole('menuitem', { name: 'Low Pass' }).focused,
      ).toBe(true);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).toBeNull();
      expect(field.focused).toBe(true);

      await user.click(field);
      await pressOutside(screen.getByRole('menu'));
      expect(screen.queryByRole('menu')).toBeNull();
      expect(field.focused).toBe(true);
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(onOpenChange.mock.calls).toEqual(
      Array.from({ length: 6 }, () => [[true], [false]]).flat(),
    );
  });

  test('typing a label goes to it, and Tab closes the list', async () => {
    await render(<Select label="Filter Type" options={filters} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('p');
    expect(screen.getByRole('menuitem', { name: 'Peak' }).focused).toBe(true);
    // No label starts "pn": the new letter alone is looked for.
    await user.keyboard('n');
    expect(screen.getByRole('menuitem', { name: 'Notch' }).focused).toBe(true);
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('combobox').focused).toBe(true);
  });

  test('unmounting while open removes the list, and two selects keep their own lists', async () => {
    function Fixture({ shown }: { shown: boolean }) {
      const [a, setA] = useState<Filter>('lowpass');
      return (
        <>
          {shown && (
            <Select label="A" options={filters} value={a} onChange={setA} />
          )}
          <Select label="B" options={filters} defaultValue="peak" />
        </>
      );
    }
    const app = await render(<Fixture shown />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'A' }));
    expect(screen.getByRole('menu', { name: 'A' })).toBeDefined();
    await app.rerender(<Fixture shown={false} />);
    expect(screen.queryByRole('menu')).toBeNull();

    await user.click(screen.getByRole('combobox', { name: 'B' }));
    await user.click(screen.getByRole('menuitem', { name: 'Notch' }));
    expect(
      screen.getByRole('combobox', { name: 'B' }).accessibility.value?.text,
    ).toBe('Notch');
  });

  test('controlled open lists coexist, and Escape closes only the one with focus', async () => {
    function Both() {
      const [first, setFirst] = useState(true);
      const [second, setSecond] = useState(true);
      return (
        <>
          <Select
            label="First"
            options={filters}
            open={first}
            onOpenChange={setFirst}
          />
          <Select
            label="Second"
            options={filters}
            open={second}
            onOpenChange={setSecond}
          />
        </>
      );
    }
    await render(<Both />);
    const user = userEvent.setup();
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    // The later one is on top, and has focus.
    expect(screen.getByRole('menu', { name: 'Second' }).focused).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: 'Second' })).toBeNull();
    expect(screen.getByRole('menu', { name: 'First' })).toBeDefined();
  });
});

import { render, screen, userEvent } from '@soundor/testing-library/react';
import { useState } from 'react';
import { environment } from 'soundor:host';
import { expect, test } from 'vitest';

import { Button, SelectableList } from '../../index';

test.each([
  { selectedIds: ['last'], initial: 'Last' },
  { selectedIds: ['off'], initial: 'First' },
  { selectedIds: [], initial: 'First' },
])(
  'has one Tab stop, initially on $initial with $selectedIds selected',
  async ({ selectedIds, initial }) => {
    await render(
      <>
        <Button>Before</Button>
        <SelectableList
          accessibilityLabel="Sources"
          items={[
            { id: 'off', label: 'Unavailable', disabled: true },
            { id: 'first', label: 'First' },
            { id: 'last', label: 'Last' },
          ]}
          selectedIds={selectedIds}
          onSelectionChange={() => {}}
        />
        <Button>After</Button>
      </>,
    );
    const user = userEvent.setup();
    const before = screen.getByRole('button', { name: 'Before' });
    const after = screen.getByRole('button', { name: 'After' });
    const first = screen.getByRole('option', { name: 'First' });
    const last = screen.getByRole('option', { name: 'Last' });
    await user.tab();
    expect(before.focused).toBe(true);
    await user.tab();
    expect(screen.getByRole('option', { name: initial }).focused).toBe(true);
    await user.keyboard('{Home}');
    expect(first.focused).toBe(true);
    await user.tab();
    expect(after.focused).toBe(true);
    await user.tab({ shift: true });
    expect(first.focused).toBe(true);
    await user.click(last);
    expect(last.focused).toBe(true);
    await user.tab({ shift: true });
    expect(before.focused).toBe(true);
    await user.tab();
    expect(last.focused).toBe(true);
  },
);

test('navigation skips disabled options and multi-select toggles independently of focus', async () => {
  function Fixture() {
    const [ids, select] = useState<readonly string[]>(['first']);
    return (
      <SelectableList
        accessibilityLabel="Sources"
        multiple
        items={[
          { id: 'first', label: 'First' },
          { id: 'off', label: 'Unavailable', disabled: true },
          { id: 'last', label: 'Last' },
        ]}
        selectedIds={ids}
        onSelectionChange={select}
      />
    );
  }
  await render(<Fixture />);
  const user = userEvent.setup();
  const first = screen.getByRole('option', { name: 'First' });
  const last = screen.getByRole('option', { name: 'Last' });
  await user.tab();
  expect(first.focused).toBe(true);
  await user.keyboard('{ArrowDown}');
  expect(last.focused).toBe(true);
  expect(last.accessibility.state?.selected).toBe(false);
  await user.keyboard('{Enter}');
  expect(last.accessibility.state?.selected).toBe(true);
  expect(first.accessibility.state?.selected).toBe(true);
  await user.keyboard('{Home}{Enter}');
  expect(first.accessibility.state?.selected).toBe(false);
});

async function extendedList() {
  function Fixture() {
    const [ids, select] = useState<readonly string[]>([]);
    return (
      <SelectableList
        accessibilityLabel="Bands"
        selectionMode="extended"
        items={['A', 'B', 'C', 'D', 'E'].map((id) => ({
          id,
          label: id,
          disabled: id === 'C',
        }))}
        selectedIds={ids}
        onSelectionChange={select}
      />
    );
  }
  await render(<Fixture />);
  const option = (name: string) => screen.getByRole('option', { name });
  return {
    user: userEvent.setup(),
    option,
    selected: () =>
      ['A', 'B', 'C', 'D', 'E'].filter(
        (id) => option(id).accessibility.state?.selected,
      ),
  };
}

const mod =
  environment.platform === 'macos' || environment.platform === 'ios'
    ? 'Meta'
    : 'Control';

test('extended presses replace, toggle, replace a range and add a range', async () => {
  const { user, option, selected } = await extendedList();
  await user.click(option('A'));
  await user.keyboard(`{${mod}>}`);
  await user.click(option('D'));
  await user.keyboard(`{/${mod}}`);
  expect(selected()).toEqual(['A', 'D']);

  await user.keyboard(`{${mod}>}{Shift>}`);
  await user.click(option('E'));
  await user.keyboard(`{/Shift}{/${mod}}`);
  expect(selected()).toEqual(['A', 'D', 'E']);

  await user.keyboard('{Shift>}');
  await user.click(option('B'));
  await user.keyboard('{/Shift}');
  expect(selected()).toEqual(['B', 'D']);
  await user.click(option('E'));
  expect(selected()).toEqual(['E']);
  await user.keyboard(`{${mod}>}`);
  await user.click(option('A'));
  await user.keyboard('{Shift>}');
  await user.click(option('D'));
  await user.keyboard(`{/Shift}{/${mod}}`);
  expect(selected()).toEqual(['A', 'B', 'D', 'E']);
});

test('extended keyboard selection moves, shrinks an anchored range, toggles and selects all', async () => {
  const { user, option, selected } = await extendedList();
  await user.tab();
  expect(selected()).toEqual([]);
  await user.keyboard('{ArrowDown}');
  expect(selected()).toEqual(['B']);
  await user.keyboard('{Shift>}{End}{/Shift}');
  expect(option('E').focused).toBe(true);
  expect(selected()).toEqual(['B', 'D', 'E']);
  await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
  expect(selected()).toEqual(['B', 'D']);
  await user.keyboard('{Control>}{ArrowUp}{ArrowUp}{/Control}');
  expect(option('A').focused).toBe(true);
  expect(selected()).toEqual(['B', 'D']);
  await user.keyboard(' ');
  expect(selected()).toEqual(['A', 'B', 'D']);
  await user.keyboard(' ');
  expect(selected()).toEqual(['B', 'D']);
  await user.keyboard(`{${mod}>}a{/${mod}}`);
  expect(selected()).toEqual(['A', 'B', 'D', 'E']);
  expect(option('A').focused).toBe(true);
  await user.keyboard('{End}');
  expect(selected()).toEqual(['E']);
});

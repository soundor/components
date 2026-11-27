import { render, screen, userEvent } from '@soundor/testing-library/react';
import { useState } from 'react';
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

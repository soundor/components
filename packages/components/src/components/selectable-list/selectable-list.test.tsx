import { render, screen, userEvent } from '@soundor/testing-library/react';
import { useState } from 'react';
import { expect, test } from 'vitest';

import { SelectableList } from '../../index';

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

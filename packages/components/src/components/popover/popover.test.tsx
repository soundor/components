import { render, screen, userEvent } from '@soundor/testing-library/react';
import { expect, test, vi } from 'vitest';

import { Button, Popover, Select } from '../../index';

test('Tab stays available, nested Select handles Escape first, and closing restores focus', async () => {
  await render(
    <Popover>
      <Popover.Trigger>
        <Button>Settings</Button>
      </Popover.Trigger>
      <Popover.Content accessibilityLabel="Settings panel" modal>
        <Button>Reset</Button>
        <Select
          label="Mode"
          options={[
            { value: 'a', label: 'First' },
            { value: 'b', label: 'Second' },
          ]}
        />
      </Popover.Content>
    </Popover>,
  );
  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: 'Settings' });
  await user.click(trigger);
  expect(screen.getByRole('button', { name: 'Reset' }).focused).toBe(true);
  await user.tab();
  const select = screen.getByRole('combobox', { name: 'Mode' });
  expect(select.focused).toBe(true);
  await user.keyboard('{Enter}');
  expect(screen.getByRole('menu')).toBeDefined();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Settings panel' })).toBeDefined();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger.focused).toBe(true);
});

test('non-modal outside presses reach their targets and can request controlled dismissal', async () => {
  const change = vi.fn();
  const outside = vi.fn();
  const fixture = (dismissOnOutside: boolean) => (
    <>
      <Button onPress={outside}>Outside</Button>
      <Popover open onOpenChange={change}>
        <Popover.Content
          anchor={{ x: 80, y: 80 }}
          autoFocus={false}
          dismissOnOutside={dismissOnOutside}
          accessibilityLabel="Editor"
        >
          <Button>Edit</Button>
        </Popover.Content>
      </Popover>
    </>
  );
  const { rerender, unmount } = await render(fixture(false));
  const user = userEvent.setup();
  expect(screen.getByRole('button', { name: 'Edit' }).focused).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(change).not.toHaveBeenCalled();
  await rerender(fixture(true));
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(outside).toHaveBeenCalledTimes(2);
  expect(change).toHaveBeenCalledExactlyOnceWith(false);
  expect(screen.getByRole('dialog')).toBeDefined();
  await unmount();
});

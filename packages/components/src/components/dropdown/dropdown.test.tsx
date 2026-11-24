import { Modal, Pressable, Text } from '@soundor/react';
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@soundor/testing-library/react';
import { createRef, useState } from 'react';
import type { UiNode } from 'soundor:ui';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { Button, Dropdown, type MenuItem } from '../../index';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function actions(spy: (id: string) => void): MenuItem[] {
  return [
    { id: 'reset', label: 'Reset', onSelect: () => spy('reset') },
    { type: 'separator' },
    {
      id: 'copy',
      label: 'Copy Value',
      hint: 'Copies the current value to the clipboard',
      onSelect: () => spy('copy'),
    },
    {
      id: 'paste',
      label: 'Paste Value',
      disabled: true,
      onSelect: () => spy('paste'),
    },
    { id: 'random', label: 'Randomize', onSelect: () => spy('random') },
  ];
}

describe('Dropdown', () => {
  test('a click opens the menu beside its Button, and the arrows skip separators and disabled items', async () => {
    const spy = vi.fn<(id: string) => void>();
    const onPress = vi.fn<() => void>();
    await render(
      <Dropdown
        trigger={<Button onPress={onPress}>Options</Button>}
        items={actions(spy)}
      />,
    );
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'Options' });
    expect(trigger.accessibility.state?.expanded).toBe(false);
    await user.click(trigger);
    // The trigger's own press still runs.
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(trigger.accessibility.state?.expanded).toBe(true);
    const menu = screen.getByRole('menu', { name: 'Options' });
    // Opened by the pointer: the menu has focus, nothing highlighted.
    expect(menu.focused).toBe(true);
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.accessibility.label)).toEqual([
      'Reset',
      'Copy Value',
      'Paste Value',
      'Randomize',
    ]);
    expect(items[1]!.accessibility.hint).toBe(
      'Copies the current value to the clipboard',
    );
    expect(items[2]!.accessibility.state?.disabled).toBe(true);

    await user.keyboard('{ArrowDown}');
    expect(items[0]!.focused).toBe(true);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(items[3]!.focused).toBe(true);
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenCalledExactlyOnceWith('random');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger.focused).toBe(true);
    expect(trigger.accessibility.state?.expanded).toBe(false);

    // A disabled item does nothing, and the menu stays.
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Paste Value' }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu')).toBeDefined();
  });

  test('from the keyboard it focuses the first item, End the last, and Escape gives focus back with no action', async () => {
    const spy = vi.fn<(id: string) => void>();
    await render(
      <Dropdown
        trigger={<Button>Options</Button>}
        items={actions(spy)}
        accessibilityLabel="Value actions"
      />,
    );
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'Options' });
    for (let round = 0; round < 4; round++) {
      trigger.focus();
      await user.keyboard('{Enter}');
      const menu = screen.getByRole('menu', { name: 'Value actions' });
      expect(
        within(menu).getByRole('menuitem', { name: 'Reset' }).focused,
      ).toBe(true);
      await user.keyboard('{End}');
      expect(
        within(menu).getByRole('menuitem', { name: 'Randomize' }).focused,
      ).toBe(true);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).toBeNull();
      expect(trigger.focused).toBe(true);
    }
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  test('an action may unmount the menu, or open a modal that gives focus back to the trigger', async () => {
    function Fixture() {
      const [shown, setShown] = useState(true);
      const [dialog, setDialog] = useState(false);
      return (
        <>
          {shown && (
            <Dropdown
              trigger={<Button>Options</Button>}
              items={[
                {
                  id: 'remove',
                  label: 'Remove',
                  onSelect: () => setShown(false),
                },
                {
                  id: 'rename',
                  label: 'Rename…',
                  onSelect: () => setDialog(true),
                },
              ]}
            />
          )}
          <Modal
            visible={dialog}
            onRequestClose={() => setDialog(false)}
            accessibilityLabel="Rename"
          >
            <Pressable onPress={() => setDialog(false)}>
              <Text>Done</Text>
            </Pressable>
          </Modal>
        </>
      );
    }
    await render(<Fixture />);
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'Options' });
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Rename…' }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'Done' }).focused).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger.focused).toBe(true);

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }));
    expect(screen.queryByRole('button', { name: 'Options' })).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('Escape in a menu opened from a modal closes the menu, not the modal', async () => {
    const onRequestClose = vi.fn<() => void>();
    await render(
      <Modal onRequestClose={onRequestClose} accessibilityLabel="Settings">
        <Dropdown trigger={<Button>More</Button>} items={actions(() => {})} />
      </Modal>,
    );
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'More' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeDefined();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onRequestClose).not.toHaveBeenCalled();
    expect(trigger.focused).toBe(true);
    await user.keyboard('{Escape}');
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  test('opened by `open` before any press, it is placed beside its trigger, whose own ref still works', async () => {
    const triggerRef = createRef<UiNode>();
    const { rerender } = await render(
      <Dropdown
        trigger={<Button ref={triggerRef}>Options</Button>}
        items={actions(() => {})}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Options' });
    expect(triggerRef.current).toBe(trigger);
    // Layout, as a runtime would report it: the trigger, and the menu's size.
    const proto = Object.getPrototypeOf(trigger) as UiNode;
    vi.spyOn(proto, 'getBoundingClientRect').mockImplementation(function (
      this: UiNode,
    ) {
      return (
        (this as unknown) === trigger
          ? { x: 50, y: 60, width: 80, height: 24 }
          : { x: 0, y: 0, width: 120, height: 100 }
      ) as ReturnType<UiNode['getBoundingClientRect']>;
    });
    await act(() =>
      rerender(
        <Dropdown
          trigger={<Button ref={triggerRef}>Options</Button>}
          items={actions(() => {})}
          open
          onOpenChange={() => {}}
        />,
      ),
    );
    const menu = screen.getByRole('menu');
    const surface = menu.parent!.parent!;
    // Below the trigger, at its start: not at the view's corner.
    expect(surface.style.left).toBe(50);
    expect(surface.style.top).toBe(88);
    // Opened in code, focus is on the first item, for the keyboard.
    expect(within(menu).getByRole('menuitem', { name: 'Reset' }).focused).toBe(
      true,
    );
  });
});

import { Modal, Pressable, Text } from '@soundor/react';
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@soundor/testing-library/react';
import {
  createRef,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { UiNode } from 'soundor:ui';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  Button,
  DropdownMenu,
  Menu,
  type DropdownMenuTriggerTarget,
} from '../../index';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Actions({ spy }: { spy: (id: string) => void }) {
  return (
    <>
      <Menu.Item onPress={() => spy('reset')}>Reset</Menu.Item>
      <Menu.Divider />
      <Menu.Item
        hint="Copies the current value to the clipboard"
        onPress={() => spy('copy')}
      >
        Copy Value
      </Menu.Item>
      <Menu.Item disabled onPress={() => spy('paste')}>
        Paste Value
      </Menu.Item>
      <Menu.Item onPress={() => spy('random')}>Randomize</Menu.Item>
    </>
  );
}

function Options({
  children,
  label,
  trigger = <Button>Options</Button>,
}: {
  children: ReactNode;
  label?: string;
  trigger?: ReactElement<DropdownMenuTriggerTarget>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Content accessibilityLabel={label}>
        {children}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

const labels = (menu: ReturnType<typeof screen.getByRole>) =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.accessibility.label);

describe('DropdownMenu', () => {
  test('a click opens the menu beside its Button, and the arrows skip dividers and disabled items', async () => {
    const spy = vi.fn<(id: string) => void>();
    const onPress = vi.fn<() => void>();
    await render(
      <Options trigger={<Button onPress={onPress}>Options</Button>}>
        <Actions spy={spy} />
      </Options>,
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
    expect(labels(menu)).toEqual([
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
      <Options label="Value actions">
        <Actions spy={spy} />
      </Options>,
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
      // Typing a label's first letter goes to it.
      await user.keyboard('c');
      expect(
        within(menu).getByRole('menuitem', { name: 'Copy Value' }).focused,
      ).toBe(true);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).toBeNull();
      expect(trigger.focused).toBe(true);
    }
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  test('items come from any composition, in the order they are laid out, including ones added while it is open', async () => {
    const spy = vi.fn<(id: string) => void>();
    const controls = { add: () => {} };
    function Fixture({ canPaste }: { canPaste: boolean }) {
      const [extra, setExtra] = useState<string[]>([]);
      useLayoutEffect(() => {
        controls.add = () => setExtra(['Middle']);
      });
      return (
        <Options>
          <Menu.Label>Edit</Menu.Label>
          <Menu.Item onPress={() => spy('first')}>First</Menu.Item>
          {extra.map((label) => (
            <Menu.Item key={label} onPress={() => spy(label)}>
              {label}
            </Menu.Item>
          ))}
          {canPaste && (
            <Menu.Item onPress={() => spy('paste')}>Paste</Menu.Item>
          )}
          {null}
          <Last />
        </Options>
      );
    }
    function Last() {
      return <Menu.Item onPress={() => spy('last')}>Last</Menu.Item>;
    }
    const { rerender } = await render(<Fixture canPaste={false} />);
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'Options' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(labels(screen.getByRole('menu'))).toEqual(['First', 'Last']);
    // The heading is read, but never focused or chosen.
    expect(screen.getByRole('header', { name: 'EDIT' }).focusable).toBe(false);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Last' }).focused).toBe(true);

    // Mounted after the rest, but laid out between them: the keyboard
    // follows the layout.
    await act(() => controls.add());
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Middle' }).focused).toBe(true);
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenCalledExactlyOnceWith('Middle');

    await rerender(<Fixture canPaste />);
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(labels(screen.getByRole('menu'))).toEqual([
      'First',
      'Middle',
      'Paste',
      'Last',
    ]);
    await user.keyboard('{End}{ArrowUp}{Enter}');
    expect(spy).toHaveBeenLastCalledWith('paste');
  });

  test('a checked item leaves room for a tick in every row, and reports its state', async () => {
    await render(
      <Options>
        <Menu.Item checked onPress={() => {}}>
          Snap to grid
        </Menu.Item>
        <Menu.Item onPress={() => {}}>Zoom to fit</Menu.Item>
      </Options>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Options' }));
    expect(
      screen.getByRole('menuitem', { name: 'Snap to grid' }).accessibility.state
        ?.checked,
    ).toBe(true);
    expect(
      screen.getByRole('menuitem', { name: 'Zoom to fit' }).accessibility.state
        ?.checked,
    ).toBe(false);
  });

  test('an action may unmount the menu, or open a modal that gives focus back to the trigger', async () => {
    function Fixture() {
      const [shown, setShown] = useState(true);
      const [dialog, setDialog] = useState(false);
      return (
        <>
          {shown && (
            <Options>
              <Menu.Item onPress={() => setShown(false)}>Remove</Menu.Item>
              <Menu.Item onPress={() => setDialog(true)}>Rename…</Menu.Item>
            </Options>
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
        <Options trigger={<Button>More</Button>}>
          <Actions spy={() => {}} />
        </Options>
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
    const fixture = (open: boolean) => (
      <DropdownMenu open={open} onOpenChange={() => {}}>
        <DropdownMenu.Trigger>
          <Button ref={triggerRef}>Options</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <Actions spy={() => {}} />
        </DropdownMenu.Content>
      </DropdownMenu>
    );
    const { rerender } = await render(fixture(false));
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
    await act(() => rerender(fixture(true)));
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

  test('enhances a custom trigger in place: its ref, handler, state and label are kept, with no node of its own', async () => {
    const ref = createRef<UiNode>();
    const onPress = vi.fn();
    await render(
      <Options
        trigger={
          <Pressable
            ref={ref}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="View options"
            accessibilityState={{ selected: true }}
          >
            <Text>⋯</Text>
          </Pressable>
        }
      >
        <Menu.Item onPress={() => {}}>Zoom to fit</Menu.Item>
      </Options>,
    );
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'View options' });
    expect(ref.current).toBe(trigger);
    // Its own state, with the menu's.
    expect(trigger.accessibility.state).toMatchObject({
      selected: true,
      expanded: false,
    });
    // One node for assistive technology: the trigger's own.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu', { name: 'View options' })).toBeDefined();
    expect(trigger.accessibility.state?.expanded).toBe(true);
    await user.accessibilityAction(trigger, 'activate');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a disabled trigger opens nothing', async () => {
    await render(
      <Options trigger={<Button disabled>Options</Button>}>
        <Menu.Item onPress={() => {}}>Reset</Menu.Item>
      </Options>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('parts outside their menu say so', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      render(<Menu.Item onPress={() => {}}>Loose</Menu.Item>),
    ).rejects.toThrow(/Menu.Item belongs inside/);
    await expect(
      render(
        <DropdownMenu.Trigger>
          <Button>Loose</Button>
        </DropdownMenu.Trigger>,
      ),
    ).rejects.toThrow(/DropdownMenu.Trigger belongs inside a DropdownMenu/);
  });
});

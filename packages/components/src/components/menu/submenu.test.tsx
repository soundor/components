import {
  advanceTime,
  render,
  screen,
  userEvent,
  within,
} from '@soundor/testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { Button, ContextMenu, DropdownMenu, Knob, Menu } from '../../index';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const filterTypes = [
  'Bell',
  'Low Shelf',
  'High Shelf',
  'Low Cut',
  'High Cut',
  'Notch',
  'Band Pass',
];

function Band({ spy }: { spy: (id: string) => void }) {
  return (
    <>
      <Menu.Item onPress={() => spy('reset')}>Reset</Menu.Item>
      <Menu.Sub>
        <Menu.SubTrigger>Filter type</Menu.SubTrigger>
        <Menu.SubContent>
          {filterTypes.map((type) => (
            <Menu.Item
              key={type}
              checked={type === 'Bell'}
              onPress={() => spy(type)}
            >
              {type}
            </Menu.Item>
          ))}
          <Menu.Sub>
            <Menu.SubTrigger>Slope</Menu.SubTrigger>
            <Menu.SubContent>
              <Menu.Item onPress={() => spy('12 dB')}>12 dB/oct</Menu.Item>
              <Menu.Item onPress={() => spy('24 dB')}>24 dB/oct</Menu.Item>
            </Menu.SubContent>
          </Menu.Sub>
        </Menu.SubContent>
      </Menu.Sub>
      <Menu.Item onPress={() => spy('delete')}>Delete</Menu.Item>
    </>
  );
}

function Fixture({ spy }: { spy: (id: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button>Band</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <Band spy={spy} />
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

async function openFromKeyboard() {
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: 'Band' });
  button.focus();
  await user.keyboard('{Enter}');
  return { user, button };
}

const trigger = () => screen.getByRole('menuitem', { name: 'Filter type' });
const submenu = () => screen.queryByRole('menu', { name: 'Filter type' });

describe('Menu.Sub', () => {
  test('the trigger is a menuitem that reports expanded; its submenu is a menu named after it', async () => {
    await render(<Fixture spy={vi.fn()} />);
    const { user } = await openFromKeyboard();
    const row = trigger();
    expect(row.accessibility.role).toBe('menuitem');
    expect(row.accessibility.state?.expanded).toBe(false);
    // Not checkable: a trigger has no checked state of its own.
    expect(row.accessibility.state?.checked).toBeUndefined();
    expect(submenu()).toBeNull();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(row.accessibility.state?.expanded).toBe(true);
    const menu = submenu()!;
    expect(menu.accessibility.role).toBe('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.accessibility.label),
    ).toEqual([...filterTypes, 'Slope']);
    // Every row of the submenu is checkable: one is checked.
    expect(
      within(menu).getByRole('menuitem', { name: 'Notch' }).accessibility.state
        ?.checked,
    ).toBe(false);
  });

  test('→ opens it on the first row, ← and Esc close it and give focus back, Esc only the innermost', async () => {
    await render(<Fixture spy={vi.fn()} />);
    const { user } = await openFromKeyboard();
    await user.keyboard('{ArrowDown}');
    expect(trigger().focused).toBe(true);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('menuitem', { name: 'Bell' }).focused).toBe(true);
    await user.keyboard('{ArrowLeft}');
    expect(submenu()).toBeNull();
    expect(trigger().focused).toBe(true);

    // Enter and Space open it too.
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'Bell' }).focused).toBe(true);
    await user.keyboard('{Escape}');
    expect(submenu()).toBeNull();
    expect(trigger().focused).toBe(true);
    await user.keyboard(' ');
    expect(screen.getByRole('menuitem', { name: 'Bell' }).focused).toBe(true);

    // Two levels: Esc closes the inner one only.
    await user.keyboard('{End}{ArrowRight}');
    expect(screen.getByRole('menuitem', { name: '12 dB/oct' }).focused).toBe(
      true,
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: 'Slope' })).toBeNull();
    expect(submenu()).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Slope' }).focused).toBe(true);
    await user.keyboard('{Escape}');
    expect(submenu()).toBeNull();
    expect(screen.getByRole('menu', { name: 'Band' })).toBeDefined();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a choice in a submenu closes the whole menu, then runs, and focus goes back to the button', async () => {
    const spy = vi.fn<(id: string) => void>();
    await render(<Fixture spy={spy} />);
    const { user, button } = await openFromKeyboard();
    await user.keyboard('{ArrowDown}{ArrowRight}{End}{ArrowRight}{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenCalledExactlyOnceWith('24 dB');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button.focused).toBe(true);
  });

  test('moving to another row of the parent with the keyboard closes the submenu', async () => {
    await render(<Fixture spy={vi.fn()} />);
    const { user } = await openFromKeyboard();
    await user.keyboard('{ArrowDown}{ArrowRight}{ArrowLeft}');
    // Opened from the pointer, focus would stay on the trigger: as here.
    await user.keyboard('{Enter}{ArrowLeft}{ArrowDown}');
    expect(submenu()).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Delete' }).focused).toBe(true);
  });

  test('the pointer opens it after resting on the trigger, and keeps focus on the trigger, which stays highlighted', async () => {
    vi.useFakeTimers();
    await render(<Fixture spy={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Band' }));
    await user.pointer({ target: trigger() });
    expect(trigger().focused).toBe(true);
    await advanceTime(100);
    expect(submenu()).toBeNull();
    await advanceTime(60);
    expect(submenu()).not.toBeNull();
    expect(trigger().focused).toBe(true);
    expect(trigger().accessibility.state?.expanded).toBe(true);
    // Esc on the trigger closes the submenu only: it is the innermost.
    await user.keyboard('{Escape}');
    expect(submenu()).toBeNull();
    expect(screen.getByRole('menu', { name: 'Band' })).toBeDefined();
    expect(trigger().focused).toBe(true);
    await user.pointer({
      target: screen.getByRole('menuitem', { name: 'Reset' }),
    });
    await user.pointer({ target: trigger() });
    await advanceTime(160);
    // → from there goes in.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('menuitem', { name: 'Bell' }).focused).toBe(true);
  });

  test('leaving the trigger before the delay opens nothing', async () => {
    vi.useFakeTimers();
    await render(<Fixture spy={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Band' }));
    await user.pointer({ target: trigger() });
    await advanceTime(80);
    await user.pointer({
      target: screen.getByRole('menuitem', { name: 'Reset' }),
    });
    await advanceTime(300);
    expect(submenu()).toBeNull();
  });

  test('a press opens it at once; a press on another row of the parent closes it and runs that row', async () => {
    const spy = vi.fn<(id: string) => void>();
    await render(<Fixture spy={spy} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Band' }));
    await user.click(trigger());
    expect(submenu()).not.toBeNull();
    // Pressed again: still open.
    await user.click(trigger());
    expect(submenu()).not.toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(spy).toHaveBeenCalledExactlyOnceWith('delete');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a disabled trigger opens nothing', async () => {
    await render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button>Band</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <Menu.Sub>
            <Menu.SubTrigger disabled>Filter type</Menu.SubTrigger>
            <Menu.SubContent>
              <Menu.Item>Bell</Menu.Item>
            </Menu.SubContent>
          </Menu.Sub>
          <Menu.Item>Delete</Menu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Band' }));
    await user.click(trigger());
    expect(submenu()).toBeNull();
    expect(trigger().accessibility.state?.disabled).toBe(true);
  });

  test('the same parts work in a ContextMenu, with side="left" swapping the keys', async () => {
    const spy = vi.fn<(id: string) => void>();
    await render(
      <ContextMenu>
        <ContextMenu.Trigger>
          <Knob label="Gain" />
        </ContextMenu.Trigger>
        <ContextMenu.Content accessibilityLabel="Band">
          <Menu.Sub side="left">
            <Menu.SubTrigger>Filter type</Menu.SubTrigger>
            <Menu.SubContent>
              <Menu.Item onPress={() => spy('bell')}>Bell</Menu.Item>
            </Menu.SubContent>
          </Menu.Sub>
        </ContextMenu.Content>
      </ContextMenu>,
    );
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(trigger().focused).toBe(true);
    await user.keyboard('{ArrowRight}');
    expect(submenu()).toBeNull();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('menuitem', { name: 'Bell' }).focused).toBe(true);
    await user.keyboard('{ArrowRight}');
    expect(submenu()).toBeNull();
    expect(trigger().focused).toBe(true);
  });

  test('parts outside their parent, and a second trigger, throw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenu.Trigger>
            <Button>Band</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <Menu.SubTrigger>Filter type</Menu.SubTrigger>
          </DropdownMenu.Content>
        </DropdownMenu>,
      ),
    ).rejects.toThrow('Menu.SubTrigger belongs inside a Menu.Sub.');
    await expect(
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenu.Trigger>
            <Button>Band</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <Menu.Sub>
              <Menu.SubTrigger>One</Menu.SubTrigger>
              <Menu.SubTrigger>Two</Menu.SubTrigger>
            </Menu.Sub>
          </DropdownMenu.Content>
        </DropdownMenu>,
      ),
    ).rejects.toThrow('A Menu.Sub takes one Menu.SubTrigger.');
  });
});

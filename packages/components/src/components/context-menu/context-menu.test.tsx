import { View } from '@soundor/react';
import {
  act,
  advanceTime,
  render,
  screen,
  userEvent,
  waitFor,
  within,
  type NodeTarget,
} from '@soundor/testing-library/react';
import { createRef, type ReactElement } from 'react';
import { clipboard, type UiNode } from 'soundor:ui';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  ContextMenu,
  DropdownMenu,
  Button,
  Fader,
  Knob,
  Menu,
  ParameterMenuItems,
  Slider,
  type HostProps,
  type ParameterMenuItemsProps,
} from '../../index';
import { parameter } from '../../test-utils';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** A control with its parameter's menu, as an application writes it. */
function WithMenu({
  children,
  label,
  onOpenChange,
  disabled,
  ...items
}: ParameterMenuItemsProps & {
  children: ReactElement<HostProps>;
  label?: string;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <ContextMenu onOpenChange={onOpenChange} disabled={disabled}>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Content accessibilityLabel={label}>
        <ParameterMenuItems {...items} />
      </ContextMenu.Content>
    </ContextMenu>
  );
}

/** A right-click at a point. */
async function secondaryPress(target: NodeTarget, x = 30, y = 40) {
  await userEvent
    .setup()
    .pointer({ target, keys: '[MouseRight]', clientX: x, clientY: y });
}

describe('ContextMenu', () => {
  test('a secondary press on a Knob opens its menu without starting a drag, and Reset is one undoable gesture', async () => {
    const gain = parameter(0.25);
    await render(
      <WithMenu parameter={gain}>
        <Knob parameter={gain} />
      </WithMenu>,
    );
    const user = userEvent.setup();
    const knob = screen.getByRole('adjustable', { name: 'Gain' });
    await secondaryPress(knob);
    // A right-click is not an edit.
    expect(gain.beginGesture).not.toHaveBeenCalled();
    expect(gain.set).not.toHaveBeenCalled();
    // It focused the knob, which gets focus back.
    expect(screen.getByRole('menu').focused).toBe(true);
    const reset = screen.getByRole('menuitem', { name: 'Reset to default' });
    // At its default, there is nothing to reset.
    expect(reset.accessibility.state?.disabled).toBe(true);
    await user.keyboard('{Escape}');
    expect(knob.focused).toBe(true);

    // Moved away from the default, the menu (made again on opening) offers it.
    await user.keyboard('{ArrowUp}');
    expect(gain.get()).toBeGreaterThan(0.25);
    await secondaryPress(knob);
    // The arrow key's gesture ended as the menu took focus.
    expect(gain.endGesture).toHaveBeenCalledTimes(1);
    gain.beginGesture.mockClear();
    gain.endGesture.mockClear();
    gain.set.mockClear();
    await user.click(
      screen.getByRole('menuitem', { name: 'Reset to default' }),
    );
    expect(gain.get()).toBe(0.25);
    expect(gain.set).toHaveBeenCalledExactlyOnceWith(0.25);
    expect(gain.beginGesture).toHaveBeenCalledExactlyOnceWith({
      history: true,
    });
    expect(gain.endGesture).toHaveBeenCalledTimes(1);
    expect(knob.focused).toBe(true);
    expect(knob.accessibility.value?.now).toBe(0.25);
  });

  test('Shift+F10 and the context menu key open it beside the focused control, and the control still takes its keys', async () => {
    const mix = parameter(0.5);
    const onOpenChange = vi.fn<(open: boolean) => void>();
    await render(
      <WithMenu parameter={mix} label="Mix actions" onOpenChange={onOpenChange}>
        <Slider parameter={mix} label="Mix" />
      </WithMenu>,
    );
    const user = userEvent.setup();
    const slider = screen.getByRole('adjustable', { name: 'Mix' });
    slider.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    const menu = screen.getByRole('menu', { name: 'Mix actions' });
    // From the keyboard, the first enabled item.
    expect(
      within(menu).getByRole('menuitem', { name: 'Copy value' }).focused,
    ).toBe(true);
    await user.keyboard('{Escape}');
    expect(slider.focused).toBe(true);
    await user.keyboard('{ContextMenu}');
    expect(screen.getByRole('menu')).toBeDefined();
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange.mock.calls).toEqual([[true], [false], [true], [false]]);

    // The slider's own keys and drag are untouched.
    await user.keyboard('{End}');
    expect(mix.get()).toBe(1);
  });

  test('copy and paste go through the clipboard as the parameter formats and parses', async () => {
    const time = parameter(0.5);
    await render(
      <WithMenu parameter={time}>
        <Fader parameter={time} />
      </WithMenu>,
    );
    const user = userEvent.setup();
    const fader = screen.getByRole('adjustable', { name: 'Gain' });
    await secondaryPress(fader);
    await user.click(screen.getByRole('menuitem', { name: 'Copy value' }));
    await waitFor(async () => expect(await clipboard.readText()).toBe('50%'));

    await act(() => clipboard.writeText('  0.09 '));
    await secondaryPress(fader);
    await user.click(screen.getByRole('menuitem', { name: 'Paste value' }));
    await waitFor(() => expect(time.get()).toBe(0.09));
    expect(time.beginGesture).toHaveBeenCalledTimes(1);
    expect(time.endGesture).toHaveBeenCalledTimes(1);

    // Text that is no value changes nothing.
    await act(() => clipboard.writeText('loud'));
    await secondaryPress(fader);
    await user.click(screen.getByRole('menuitem', { name: 'Paste value' }));
    await act(async () => {});
    expect(time.get()).toBe(0.09);
    expect(time.beginGesture).toHaveBeenCalledTimes(1);
  });

  test('a primary drag still edits, and a secondary press during it opens nothing', async () => {
    const gain = parameter(0.25);
    await render(
      <WithMenu parameter={gain}>
        <Knob parameter={gain} />
      </WithMenu>,
    );
    const user = userEvent.setup();
    const knob = screen.getByRole('adjustable', { name: 'Gain' });
    await user.pointer([
      { target: knob, keys: '[MouseLeft>]', clientY: 100 },
      { clientY: 60 },
    ]);
    await user.pointer({ keys: '[MouseRight]', clientY: 60 });
    expect(screen.queryByRole('menu')).toBeNull();
    await user.pointer({ keys: '[/MouseLeft]', clientY: 60 });
    expect(gain.get()).toBeCloseTo(0.5625);
    expect(gain.beginGesture).toHaveBeenCalledTimes(1);
    expect(gain.endGesture).toHaveBeenCalledTimes(1);
  });

  test('read-only parameters keep Copy only; items made at opening; an empty menu closes as it opens; unmounting while open is safe', async () => {
    const meter = parameter(0.7);
    const readOnly = {
      ...meter,
      info: { ...meter.info, access: 'readOnly' as const },
    };
    const onEnterValue = vi.fn<() => void>();
    const onEmptyChange = vi.fn<(open: boolean) => void>();
    const app = await render(
      <>
        <WithMenu parameter={readOnly} onEnterValue={onEnterValue}>
          <Knob parameter={readOnly} label="Level" />
        </WithMenu>
        <ContextMenu onOpenChange={onEmptyChange}>
          <ContextMenu.Trigger>
            <Knob label="Empty" />
          </ContextMenu.Trigger>
          <ContextMenu.Content>{false}</ContextMenu.Content>
        </ContextMenu>
      </>,
    );
    const empty = screen.getByRole('adjustable', { name: 'Empty' });
    await secondaryPress(empty);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onEmptyChange.mock.calls).toEqual([[true], [false]]);

    const level = screen.getByRole('adjustable', { name: 'Level' });
    expect(level.accessibility.state?.readOnly).toBe(true);
    const user = userEvent.setup();
    await user.dblClick(level);
    await user.keyboard('{End}');
    await user.wheel(level, { deltaY: -1 });
    expect(level.focused).toBe(true);
    expect(meter.set).not.toHaveBeenCalled();
    expect(meter.beginGesture).not.toHaveBeenCalled();
    await secondaryPress(level);
    const state = (name: string) =>
      screen.getByRole('menuitem', { name }).accessibility.state?.disabled;
    expect(state('Reset to default')).toBe(true);
    expect(state('Enter value…')).toBe(true);
    expect(state('Paste value')).toBe(true);
    expect(state('Copy value')).toBe(false);

    await app.unmount();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('attaches to its child without a wrapper, keeping its ref and actions, and offers Show menu to a screen reader', async () => {
    const gain = parameter(0.25);
    const outer = createRef<UiNode>();
    const knobRef = createRef<UiNode>();
    const onAction = vi.fn();
    await render(
      <View ref={outer} style={{ flexDirection: 'row' }}>
        <WithMenu parameter={gain}>
          <Knob
            parameter={gain}
            ref={knobRef}
            accessibilityActions={[{ name: 'learn', label: 'MIDI learn' }]}
            onAccessibilityAction={onAction}
          />
        </WithMenu>
      </View>,
    );
    const knob = screen.getByRole('adjustable', { name: 'Gain' });
    // The child's ref still reaches its node.
    expect(knobRef.current).toBe(knob);
    // No view of the ContextMenu's own: the Knob's root is the row's child.
    expect(knob.parent?.parent).toBe(outer.current);
    // The Knob's actions first, then the caller's, then Show menu.
    expect(knob.accessibility.actions?.map((action) => action.name)).toEqual([
      'increment',
      'decrement',
      'setValue',
      'reset',
      'learn',
      'showContextMenu',
    ]);
    // Its own still work, and the caller's reaches the caller.
    const user = userEvent.setup();
    await user.accessibilityAction(knob, 'increment');
    expect(gain.get()).toBeGreaterThan(0.25);
    await user.accessibilityAction(knob, 'learn');
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]![0].actionName).toBe('learn');

    // Show menu opens it beside the control, on its first item.
    knob.focus();
    await user.accessibilityAction(knob, 'showContextMenu');
    const menu = screen.getByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: 'Reset to default' }).focused,
    ).toBe(true);
  });

  test("a long touch opens it at the touch, on the engine's long press; one that moves is the control's", async () => {
    const gain = parameter(0.25);
    const at = { clientX: 20, clientY: 20 };
    const { rerender } = await render(
      <WithMenu parameter={gain}>
        <Knob parameter={gain} />
      </WithMenu>,
    );
    const user = userEvent.setup();
    const knob = screen.getByRole('adjustable', { name: 'Gain' });

    await user.pointer({ target: knob, keys: '[TouchA>]', ...at });
    await advanceTime(499);
    expect(screen.queryByRole('menu')).toBeNull();
    await advanceTime(1);
    expect(screen.getByRole('menu')).toBeDefined();
    await user.pointer({ keys: '[/TouchA]', ...at });
    // Opening it was no edit: the press's gesture ended as focus left.
    expect(gain.get()).toBe(0.25);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();

    // Moved: a drag, no menu.
    await user.pointer([
      { target: knob, keys: '[TouchA>]', ...at },
      { pointerName: 'TouchA', ...at, clientY: 40 },
    ]);
    await advanceTime(600);
    expect(screen.queryByRole('menu')).toBeNull();
    await user.pointer({ keys: '[/TouchA]', ...at, clientY: 40 });
    expect(gain.get()).toBeLessThan(0.25);

    // Disabled, a long touch opens nothing, and there is no Show menu.
    await rerender(
      <WithMenu parameter={gain} disabled>
        <Knob parameter={gain} />
      </WithMenu>,
    );
    expect(
      knob.accessibility.actions?.map((action) => action.name),
    ).not.toContain('showContextMenu');
    await user.pointer({ target: knob, keys: '[TouchA>]', ...at });
    await advanceTime(600);
    expect(screen.queryByRole('menu')).toBeNull();
    await user.pointer({ keys: '[/TouchA]', ...at });
  });

  test('unmounted during a long touch, it opens nothing later and leaves no listener behind', async () => {
    const gain = parameter(0.25);
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const app = await render(
      <WithMenu parameter={gain} onOpenChange={onOpenChange}>
        <Knob parameter={gain} />
      </WithMenu>,
    );
    const knob = screen.getByRole('adjustable', { name: 'Gain' });
    const removed = vi.spyOn(knob, 'removeEventListener');
    await userEvent
      .setup()
      .pointer({ target: knob, keys: '[TouchA>]', clientX: 20, clientY: 20 });
    await app.unmount();
    await advanceTime(600);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(removed.mock.calls.map(([type]) => type)).toContain('contextmenu');
  });

  test('a control inside another ContextMenu opens only its own menu, by any way in', async () => {
    const gain = parameter(0.25);
    await render(
      <ContextMenu>
        <ContextMenu.Trigger>
          <View>
            <WithMenu parameter={gain} label="Gain menu">
              <Knob parameter={gain} />
            </WithMenu>
          </View>
        </ContextMenu.Trigger>
        <ContextMenu.Content accessibilityLabel="Panel menu">
          <Menu.Item onPress={() => {}}>Reset panel</Menu.Item>
        </ContextMenu.Content>
      </ContextMenu>,
    );
    const user = userEvent.setup();
    const knob = screen.getByRole('adjustable', { name: 'Gain' });
    await secondaryPress(knob);
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(screen.getByRole('menu', { name: 'Gain menu' })).toBeDefined();
    await user.keyboard('{Escape}');
    knob.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(screen.getByRole('menu', { name: 'Gain menu' })).toBeDefined();
    await user.keyboard('{Escape}');
    await user.accessibilityAction(knob, 'showContextMenu');
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(screen.getByRole('menu', { name: 'Gain menu' })).toBeDefined();
  });

  test('one component of items works in a ContextMenu and a DropdownMenu alike', async () => {
    const gain = parameter(0.6);
    const copy = vi.fn();
    function ParameterActions() {
      return (
        <>
          <ParameterMenuItems parameter={gain} clipboard={false} />
          <Menu.Item onPress={copy}>Copy settings</Menu.Item>
        </>
      );
    }
    await render(
      <>
        <ContextMenu>
          <ContextMenu.Trigger>
            <Knob parameter={gain} />
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ParameterActions />
          </ContextMenu.Content>
        </ContextMenu>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button>Gain</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <ParameterActions />
          </DropdownMenu.Content>
        </DropdownMenu>
      </>,
    );
    const user = userEvent.setup();
    const names = () =>
      screen.getAllByRole('menuitem').map((item) => item.accessibility.label);
    await secondaryPress(screen.getByRole('adjustable', { name: 'Gain' }));
    expect(names()).toEqual(['Reset to default', 'Copy settings']);
    await user.keyboard('{End}{Enter}');
    expect(copy).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Gain' }));
    expect(names()).toEqual(['Reset to default', 'Copy settings']);
    await user.click(
      screen.getByRole('menuitem', { name: 'Reset to default' }),
    );
    expect(gain.get()).toBe(0.6);
    expect(gain.set).not.toHaveBeenCalled();
  });
});

import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@soundor/testing-library/react';
import { clipboard } from 'soundor:ui';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  ContextMenu,
  Fader,
  Knob,
  Slider,
  parameterMenuItems,
  type MenuItem,
} from '../../index';
import { parameter } from '../../test-utils';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function secondaryPress(
  target: Parameters<typeof fireEvent.pointerDown>[0],
  x = 30,
  y = 40,
) {
  fireEvent.pointerDown(target, {
    button: 2,
    buttons: 2,
    clientX: x,
    clientY: y,
  });
  fireEvent.pointerUp(target, { button: 2, clientX: x, clientY: y });
}

describe('ContextMenu', () => {
  test('a secondary press on a Knob opens its menu without starting a drag, and Reset is one undoable gesture', async () => {
    const gain = parameter(0.25);
    await render(
      <ContextMenu items={() => parameterMenuItems(gain)}>
        <Knob parameter={gain} />
      </ContextMenu>,
    );
    const user = userEvent.setup();
    const knob = screen.getByRole('adjustable', { name: 'Gain' });
    secondaryPress(knob);
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
    secondaryPress(knob);
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
      <ContextMenu
        items={() => parameterMenuItems(mix)}
        accessibilityLabel="Mix actions"
        onOpenChange={onOpenChange}
      >
        <Slider parameter={mix} label="Mix" />
      </ContextMenu>,
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
    fireEvent.keyDown(slider, { key: 'ContextMenu' });
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
      <ContextMenu items={() => parameterMenuItems(time)}>
        <Fader parameter={time} />
      </ContextMenu>,
    );
    const user = userEvent.setup();
    const fader = screen.getByRole('adjustable', { name: 'Gain' });
    secondaryPress(fader);
    await user.click(screen.getByRole('menuitem', { name: 'Copy value' }));
    await waitFor(async () => expect(await clipboard.readText()).toBe('50%'));

    await act(() => clipboard.writeText('  0.09 '));
    secondaryPress(fader);
    await user.click(screen.getByRole('menuitem', { name: 'Paste value' }));
    await waitFor(() => expect(time.get()).toBe(0.09));
    expect(time.beginGesture).toHaveBeenCalledTimes(1);
    expect(time.endGesture).toHaveBeenCalledTimes(1);

    // Text that is no value changes nothing.
    await act(() => clipboard.writeText('loud'));
    secondaryPress(fader);
    await user.click(screen.getByRole('menuitem', { name: 'Paste value' }));
    await act(async () => {});
    expect(time.get()).toBe(0.09);
    expect(time.beginGesture).toHaveBeenCalledTimes(1);
  });

  test('a primary drag still edits, and a secondary press during it opens nothing', async () => {
    const gain = parameter(0.25);
    await render(
      <ContextMenu items={() => parameterMenuItems(gain)}>
        <Knob parameter={gain} />
      </ContextMenu>,
    );
    const knob = screen.getByRole('adjustable', { name: 'Gain' });
    fireEvent.pointerDown(knob, { clientY: 100, buttons: 1 });
    fireEvent.pointerMove(knob, { clientY: 60, buttons: 1 });
    fireEvent(knob, 'contextmenu', { button: 2, buttons: 3 });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.pointerUp(knob, { clientY: 60 });
    expect(gain.get()).toBeCloseTo(0.5625);
    expect(gain.beginGesture).toHaveBeenCalledTimes(1);
    expect(gain.endGesture).toHaveBeenCalledTimes(1);
  });

  test('read-only parameters keep Copy only; items made at opening; an empty list opens nothing; unmounting while open is safe', async () => {
    const meter = parameter(0.7);
    const readOnly = {
      ...meter,
      info: { ...meter.info, access: 'readOnly' as const },
    };
    const make = vi.fn<() => MenuItem[]>(() => []);
    const onEnterValue = vi.fn<() => void>();
    const app = await render(
      <>
        <ContextMenu
          items={() => parameterMenuItems(readOnly, { onEnterValue })}
        >
          <Knob parameter={readOnly} label="Level" />
        </ContextMenu>
        <ContextMenu items={make}>
          <Knob label="Empty" />
        </ContextMenu>
      </>,
    );
    secondaryPress(screen.getByRole('adjustable', { name: 'Empty' }));
    expect(make).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();

    secondaryPress(screen.getByRole('adjustable', { name: 'Level' }));
    const state = (name: string) =>
      screen.getByRole('menuitem', { name }).accessibility.state?.disabled;
    expect(state('Reset to default')).toBe(true);
    expect(state('Enter value…')).toBe(true);
    expect(state('Paste value')).toBe(true);
    expect(state('Copy value')).toBe(false);

    await app.unmount();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

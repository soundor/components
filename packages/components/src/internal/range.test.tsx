import { TextInput, View } from '@soundor/react';
import {
  advanceTime,
  fireEvent,
  render,
  screen,
  userEvent,
  type NodeTarget,
} from '@soundor/testing-library/react';
import { createRef } from 'react';
import type { UiNode } from 'soundor:ui';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useKnob, useXYPad } from '../headless';
import { Fader, Knob, Slider, ValueField, XYPad } from '../index';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
import { parameter } from '../test-utils';

describe('range interactions', () => {
  test('drag uses native parameter mapping, Shift enables fine travel, Escape restores its exact initial value', async () => {
    const gain = parameter(0.25);
    const change = vi.fn<(value: number) => void>();
    const end = vi.fn<(value: number) => void>();
    function Dial() {
      const control = useKnob({
        parameter: gain,
        onChange: change,
        onChangeEnd: end,
      });
      return <View {...control.handlers} />;
    }
    const user = userEvent.setup();
    await render(<Dial />);
    const dial = screen.getByRole('adjustable', { name: 'Gain' });
    await user.pointer([
      { target: dial, keys: '[MouseLeft>]', clientY: 100 },
      { clientY: 60 },
    ]);
    expect(gain.get()).toBeCloseTo(0.5625);
    await user.keyboard('{Shift>}');
    await user.pointer({ clientY: 20 });
    expect(gain.get()).toBeCloseTo(0.600625);
    await user.keyboard('{/Shift}{Escape}');
    await user.pointer({ keys: '[/MouseLeft]' });
    expect(gain.get()).toBe(0.25);
    expect(gain.beginGesture).toHaveBeenCalledExactlyOnceWith({
      history: true,
    });
    expect(gain.endGesture).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenLastCalledWith(0.25);
    expect(end).toHaveBeenCalledExactlyOnceWith(0.25);
    expect(dial.accessibility.value?.text).toBe('25%');
  });

  test('key and wheel bursts each close once and changing a parameter closes the old drag', async () => {
    vi.useFakeTimers();
    const gain = parameter();
    const next = parameter(0.25);
    const user = userEvent.setup();
    const app = await render(<Knob parameter={gain} />);
    const dial = screen.getByRole('adjustable', { name: 'Gain' });
    await user.tab();
    await user.keyboard('{ArrowUp}{PageUp}');
    expect(gain.beginGesture).toHaveBeenCalledTimes(1);
    expect(gain.endGesture).not.toHaveBeenCalled();
    await advanceTime(260);
    expect(gain.endGesture).toHaveBeenCalledTimes(1);

    // No wheel in userEvent.
    fireEvent(dial, 'wheel', { deltaY: -1 });
    fireEvent(dial, 'wheel', { deltaY: -1 });
    expect(gain.beginGesture).toHaveBeenCalledTimes(2);
    await advanceTime(260);
    expect(gain.endGesture).toHaveBeenCalledTimes(2);

    await user.pointer({ target: dial, keys: '[MouseLeft>]' });
    await app.rerender(<Knob parameter={next} />);
    expect(gain.endGesture).toHaveBeenCalledTimes(3);
    await user.pointer({ keys: '[/MouseLeft]' });
    expect(next.endGesture).not.toHaveBeenCalled();
    await user.pointer({ keys: '[MouseLeft>]' });
    await app.unmount();
    expect(next.endGesture).toHaveBeenCalledTimes(1);
  });

  test('slider absolute drag uses insets, fader drag is relative, and reset is accessible', async () => {
    const user = userEvent.setup();
    await render(
      <>
        <Slider label="Amount" defaultValue={0.2} step={0.1} />
        <Fader label="Output" defaultValue={0.5} ticks={[0, 0.5, 1]} />
      </>,
    );
    const slider = screen.getByRole('adjustable', { name: 'Amount' });
    const fader = screen.getByRole('adjustable', { name: 'Output' });
    Object.defineProperty(slider, 'getBoundingClientRect', {
      value: () => ({ x: 20, y: 10, width: 112, height: 20 }),
    });
    Object.defineProperty(fader, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 56, height: 160 }),
    });
    await user.pointer({ target: slider, keys: '[MouseLeft]', clientX: 101 });
    expect(slider.accessibility.value?.now).toBe(0.8);
    // A screen reader's action, and a cancelled press: no userEvent for them.
    fireEvent.accessibilityAction(slider, { actionName: 'reset' });
    expect(slider.accessibility.value?.now).toBe(0.2);
    await user.pointer({ target: fader, keys: '[MouseLeft>]', clientY: 90 });
    expect(fader.accessibility.value?.now).toBe(0.5);
    await user.pointer({ clientY: 61 });
    fireEvent.pointerCancel(fader);
    expect(fader.accessibility.value?.now).toBeCloseTo(0.75);
    await user.keyboard('{Home}');
    expect(fader.accessibility.value?.now).toBe(0);
    await user.keyboard('{End}');
    expect(fader.accessibility.value?.now).toBe(1);
    await user.dblClick(fader);
    expect(fader.accessibility.value?.now).toBe(0.5);
  });

  test('a relative XY handle stays at its bounds until the pointer returns', async () => {
    const x = parameter(0.25);
    const y = parameter(0.25);
    function Handle() {
      const drag = useXYPad(
        { parameter: x },
        { parameter: y },
        { label: 'Point', dragMode: 'relative', travel: [100, 100] },
      );
      return <View {...drag.handlers} />;
    }
    const user = userEvent.setup();
    await render(<Handle />);
    const handle = screen.getByRole('adjustable', { name: 'Point' });
    await user.pointer({
      target: handle,
      keys: '[MouseLeft>]',
      clientX: 55,
      clientY: 45,
    });
    expect(x.get()).toBe(0.25);
    expect(y.get()).toBe(0.25);

    await user.pointer({ clientX: 155, clientY: 145 });
    expect(x.get()).toBe(1);
    expect(y.get()).toBe(0);
    await user.pointer({ clientX: 125, clientY: 115 });
    expect(x.get()).toBe(1);
    expect(y.get()).toBe(0);

    await user.pointer({ clientX: 95, clientY: 65 });
    expect(x.get()).toBeCloseTo(0.81);
    expect(y.get()).toBeCloseTo(0.09);
    await user.pointer({ keys: '[/MouseLeft]' });
    expect(x.endGesture).toHaveBeenCalledTimes(1);
    expect(y.endGesture).toHaveBeenCalledTimes(1);
  });

  test('the pad balances both gestures, supports keyboard adjustment and resets both axes', async () => {
    const user = userEvent.setup();
    const x = parameter(0.25);
    const y = parameter(0.75);
    await render(
      <XYPad
        label="Position"
        x={{ parameter: x, label: 'Time' }}
        y={{ parameter: y, label: 'Level' }}
      />,
    );
    const pad = screen.getByRole('adjustable', { name: 'Position' });
    Object.defineProperty(pad, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 280, height: 180 }),
    });
    await user.pointer([
      { target: pad, keys: '[MouseLeft>]', clientX: 140, clientY: 78 },
    ]);
    expect(x.get()).toBeCloseTo(0.25);
    expect(y.get()).toBeCloseTo(0.25);
    await user.pointer([
      { clientX: 257, clientY: 23 },
      { keys: '[/MouseLeft]', clientX: 257, clientY: 23 },
    ]);
    expect(x.get()).toBe(1);
    expect(y.get()).toBe(1);
    expect(x.endGesture).toHaveBeenCalledTimes(1);
    expect(y.endGesture).toHaveBeenCalledTimes(1);
    await user.keyboard('{ArrowDown}');
    expect(y.get()).toBeLessThan(1);
    // On the handle, where the drag left it: a double-click resets.
    await doubleClick(user, pad, { clientX: 257, clientY: 23 });
    expect(pad.accessibility.value?.text).toBe('Time 25%, Level 75%');
  });
});

describe('Alt-click (Option-click on a Mac) resets', () => {
  test('a Knob: one gesture, and no drag after it; the dblclick of an Alt-double-click does nothing more', async () => {
    const user = userEvent.setup();
    const gain = parameter(0.25);
    await render(<Knob parameter={gain} />);
    const dial = screen.getByRole('adjustable', { name: 'Gain' });
    await user.tab();
    await user.keyboard('{End}');
    expect(gain.get()).toBe(1);
    const gestures = gain.beginGesture.mock.calls.length;
    await user.keyboard('{Alt>}');
    await user.pointer({ target: dial, keys: '[MouseLeft>]', clientY: 100 });
    expect(gain.get()).toBe(0.25);
    expect(gain.beginGesture).toHaveBeenCalledTimes(gestures + 1);
    expect(gain.endGesture).toHaveBeenCalledTimes(gestures + 1);
    await user.pointer([{ clientY: 40 }, { keys: '[/MouseLeft]' }]);
    expect(gain.get()).toBe(0.25);
    // Each press resets; the dblclick after them, nothing.
    await user.dblClick(dial);
    expect(gain.beginGesture).toHaveBeenCalledTimes(gestures + 3);
    await user.keyboard('{/Alt}');
  });

  test('a Slider resets without jumping to the pointer first', async () => {
    const user = userEvent.setup();
    const gain = parameter(0.25);
    await render(<Slider parameter={gain} />);
    const slider = screen.getByRole('adjustable', { name: 'Gain' });
    Object.defineProperty(slider, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 100, height: 20 }),
    });
    await user.tab();
    await user.keyboard('{End}{Alt>}');
    await user.pointer({ target: slider, keys: '[MouseLeft]', clientX: 90 });
    await user.keyboard('{/Alt}');
    expect(gain.get()).toBe(0.25);
    expect(gain.set).not.toHaveBeenCalledWith(
      expect.closeTo(0.81, 2),
      expect.anything(),
    );
  });

  test('a ValueField resets, and its double-click still types a value unless Alt is held', async () => {
    const user = userEvent.setup();
    const gain = parameter(0.25);
    await render(<ValueField parameter={gain} />);
    const field = screen.getByRole('adjustable', { name: 'Gain' });
    await user.tab();
    await user.keyboard('{End}{Alt>}');
    await user.click(field);
    expect(gain.get()).toBe(0.25);
    await user.dblClick(field);
    expect(screen.queryByRole('textinput', { name: 'Gain' })).toBeNull();
    await user.keyboard('{/Alt}');
    await user.dblClick(field);
    expect(screen.queryByRole('textinput', { name: 'Gain' })).not.toBeNull();
  });

  test('an XYPad resets both axes', async () => {
    const user = userEvent.setup();
    const x = parameter(0.25);
    const y = parameter(0.25);
    await render(
      <XYPad
        label="Position"
        x={{ parameter: x, label: 'Time' }}
        y={{ parameter: y, label: 'Level' }}
      />,
    );
    const pad = screen.getByRole('adjustable', { name: 'Position' });
    Object.defineProperty(pad, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 280, height: 180 }),
    });
    await user.tab();
    await user.keyboard('{ArrowUp}{ArrowRight}{Alt>}');
    await user.pointer([
      { target: pad, keys: '[MouseLeft>]', clientX: 250, clientY: 20 },
      { clientX: 10, clientY: 170 },
      { keys: '[/MouseLeft]' },
    ]);
    await user.keyboard('{/Alt}');
    expect(x.get()).toBe(0.25);
    expect(y.get()).toBe(0.25);
  });

  test('not while disabled', async () => {
    const gain = parameter(0.25);
    gain.set(0.8);
    await render(<Knob parameter={gain} disabled />);
    // userEvent skips a disabled control; this is the control's own guard.
    fireEvent.pointerDown(screen.getByRole('adjustable', { name: 'Gain' }), {
      altKey: true,
    });
    expect(gain.get()).toBe(0.8);
  });
});

/**
 * A real double-click at a point: two presses, the runtime counting their
 * clicks as a series, then dblclick.
 */
async function doubleClick(
  user: ReturnType<typeof userEvent.setup>,
  node: NodeTarget,
  at: { clientX?: number; clientY?: number },
) {
  await user.pointer([
    { target: node, ...at },
    { target: node, keys: '[MouseLeft]', detail: 1, ...at },
    { target: node, keys: '[MouseLeft]', detail: 2, ...at },
  ]);
}

describe('a press on the handle grabs it; elsewhere it jumps', () => {
  const pad = async () => {
    const x = parameter(0.25);
    const y = parameter(0.25);
    await render(
      <XYPad
        label="Position"
        width={280}
        height={180}
        x={{ parameter: x, label: 'Time' }}
        y={{ parameter: y, label: 'Level' }}
      />,
    );
    const node = screen.getByRole('adjustable', { name: 'Position' });
    Object.defineProperty(node, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 280, height: 180 }),
    });
    return { x, y, node, user: userEvent.setup() };
  };

  test('XYPad: a press on the handle does not move it, and a drag keeps the offset', async () => {
    const { x, y, node, user } = await pad();
    // The handle, at 50% / 50% (the parameters' 0.25 on a square-root
    // mapping), is at (140, 90) in a 23-pixel inset.
    await user.pointer({
      target: node,
      keys: '[MouseLeft>]',
      clientX: 150,
      clientY: 95,
    });
    expect(x.get()).toBe(0.25);
    expect(y.get()).toBe(0.25);
    expect(x.set).not.toHaveBeenCalled();
    await user.pointer([
      { clientX: 160, clientY: 95 },
      { keys: '[/MouseLeft]', clientX: 160, clientY: 95 },
    ]);
    // Moved by the pointer's 10 pixels, not to the pointer.
    expect(Math.sqrt(x.get())).toBeCloseTo(0.5 + 10 / 234, 3);
  });

  test('XYPad: a double-click on the handle resets it in one gesture', async () => {
    const { x, y, node, user } = await pad();
    await user.tab();
    await user.keyboard('{End}{ArrowRight}');
    const before = Math.sqrt(x.get());
    const at = { clientX: 23 + before * 234, clientY: 90 };
    const gestures = x.beginGesture.mock.calls.length;
    x.set.mockClear();
    await doubleClick(user, node, at);
    expect(x.get()).toBe(0.25);
    expect(y.get()).toBe(0.25);
    // Two presses that changed nothing open no gesture of their own; the
    // reset opens one. (An unchanged press still opens and closes one.)
    expect(x.set).toHaveBeenCalledTimes(1);
    expect(x.beginGesture.mock.calls.length).toBe(gestures + 3);
  });

  test('XYPad: a double-click away from the handle jumps there, and does not reset', async () => {
    const { x, node, user } = await pad();
    await doubleClick(user, node, { clientX: 257, clientY: 90 });
    expect(x.get()).toBe(1);
  });

  test('Slider: on the thumb a press grabs it, and a double-click resets; away, it jumps', async () => {
    const user = userEvent.setup();
    const gain = parameter(0.25);
    await render(<Slider parameter={gain} width={112} />);
    const slider = screen.getByRole('adjustable', { name: 'Gain' });
    Object.defineProperty(slider, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 112, height: 20 }),
    });
    // The thumb, at 50%, is at 56 in a 6-pixel inset; 9 pixels off still
    // grabs it.
    await user.pointer({ target: slider, keys: '[MouseLeft]', clientX: 65 });
    expect(gain.set).not.toHaveBeenCalled();
    await doubleClick(user, slider, { clientX: 100 });
    expect(gain.get()).toBeGreaterThan(0.25);
    const moved = gain.get();
    const thumb = 6 + Math.sqrt(moved) * 100;
    await doubleClick(user, slider, { clientX: thumb });
    expect(gain.get()).toBe(0.25);
  });
});

describe('Delete or Backspace resets the focused control', () => {
  test.each(['Delete', 'Backspace'])(
    '%s on a Knob: one gesture',
    async (key) => {
      const user = userEvent.setup();
      const gain = parameter(0.25);
      await render(<Knob parameter={gain} />);
      await user.tab();
      await user.keyboard('{End}');
      vi.useFakeTimers();
      await advanceTime(300);
      const gestures = gain.beginGesture.mock.calls.length;
      await user.keyboard(`{${key}}`);
      expect(gain.get()).toBe(0.25);
      expect(gain.beginGesture).toHaveBeenCalledTimes(gestures + 1);
      expect(gain.endGesture).toHaveBeenCalledTimes(gestures + 1);
    },
  );

  test('not with Command, Control or Alt, nor while disabled', async () => {
    const user = userEvent.setup();
    const gain = parameter(0.25);
    gain.set(0.8);
    const app = await render(<Knob parameter={gain} />);
    await user.tab();
    for (const modifier of ['Meta', 'Control', 'Alt'])
      await user.keyboard(`{${modifier}>}{Backspace}{/${modifier}}`);
    expect(gain.get()).toBe(0.8);
    await app.rerender(<Knob parameter={gain} disabled />);
    // userEvent sends no key to a disabled control; this is its own guard.
    fireEvent.keyDown(screen.getByRole('adjustable', { name: 'Gain' }), {
      key: 'Delete',
    });
    expect(gain.get()).toBe(0.8);
  });

  test('not from a text input inside a custom control', async () => {
    const gain = parameter(0.25);
    gain.set(0.8);
    const input = createRef<UiNode>();
    function Custom() {
      const control = useKnob({ parameter: gain });
      return (
        <View {...control.handlers}>
          <TextInput ref={input} />
        </View>
      );
    }
    const user = userEvent.setup();
    await render(<Custom />);
    await user.click(input.current as unknown as NodeTarget);
    await user.keyboard('{Backspace}');
    expect(gain.get()).toBe(0.8);
  });

  test('Slider, Fader and ValueField; an XYPad resets both axes', async () => {
    const user = userEvent.setup();
    const values = [parameter(0.25), parameter(0.25), parameter(0.25)];
    const x = parameter(0.25);
    const y = parameter(0.25);
    await render(
      <View>
        <Slider parameter={values[0]!} label="Slider" />
        <Fader parameter={values[1]!} label="Fader" />
        <ValueField parameter={values[2]!} label="Field" />
        <XYPad
          label="Position"
          x={{ parameter: x, label: 'Time' }}
          y={{ parameter: y, label: 'Level' }}
        />
      </View>,
    );
    // In tab order.
    for (const _ of ['Slider', 'Fader', 'Field', 'Position']) {
      await user.tab();
      await user.keyboard('{End}{ArrowUp}{ArrowRight}{Delete}');
    }
    for (const value of values) expect(value.get()).toBe(0.25);
    expect(x.get()).toBe(0.25);
    expect(y.get()).toBe(0.25);
  });
});

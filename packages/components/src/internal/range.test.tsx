import { View } from '@soundor/react';
import {
  advanceTime,
  fireEvent,
  render,
  screen,
} from '@soundor/testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useKnob, useXYPad } from '../headless';
import { Fader, Knob, Slider, XYPad } from '../index';

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
    await render(<Dial />);
    const dial = screen.getByRole('adjustable', { name: 'Gain' });
    fireEvent.pointerDown(dial, { clientY: 100 });
    fireEvent.pointerMove(dial, { clientY: 60 });
    expect(gain.get()).toBeCloseTo(0.5625);
    fireEvent.pointerMove(dial, { clientY: 20, shiftKey: true });
    expect(gain.get()).toBeCloseTo(0.600625);
    fireEvent.keyDown(dial, { key: 'Escape' });
    fireEvent.pointerUp(dial);
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
    const app = await render(<Knob parameter={gain} />);
    const dial = screen.getByRole('adjustable', { name: 'Gain' });
    fireEvent.keyDown(dial, { key: 'ArrowUp' });
    fireEvent.keyDown(dial, { key: 'PageUp' });
    expect(gain.beginGesture).toHaveBeenCalledTimes(1);
    expect(gain.endGesture).not.toHaveBeenCalled();
    await advanceTime(260);
    expect(gain.endGesture).toHaveBeenCalledTimes(1);

    fireEvent(dial, 'wheel', { deltaY: -1 });
    fireEvent(dial, 'wheel', { deltaY: -1 });
    expect(gain.beginGesture).toHaveBeenCalledTimes(2);
    await advanceTime(260);
    expect(gain.endGesture).toHaveBeenCalledTimes(2);

    fireEvent.pointerDown(dial);
    await app.rerender(<Knob parameter={next} />);
    expect(gain.endGesture).toHaveBeenCalledTimes(3);
    fireEvent.pointerUp(dial);
    expect(next.endGesture).not.toHaveBeenCalled();
    fireEvent.pointerDown(dial);
    await app.unmount();
    expect(next.endGesture).toHaveBeenCalledTimes(1);
  });

  test('slider absolute drag uses insets, fader drag is relative, and reset is accessible', async () => {
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
    fireEvent.pointerDown(slider, { clientX: 101 });
    fireEvent.pointerUp(slider, { clientX: 101 });
    expect(slider.accessibility.value?.now).toBe(0.8);
    fireEvent.accessibilityAction(slider, { actionName: 'reset' });
    expect(slider.accessibility.value?.now).toBe(0.2);
    fireEvent.pointerDown(fader, { clientY: 90 });
    expect(fader.accessibility.value?.now).toBe(0.5);
    fireEvent.pointerMove(fader, { clientY: 61 });
    fireEvent.pointerCancel(fader);
    expect(fader.accessibility.value?.now).toBeCloseTo(0.75);
    fireEvent.keyDown(fader, { key: 'Home' });
    expect(fader.accessibility.value?.now).toBe(0);
    fireEvent.keyDown(fader, { key: 'End' });
    expect(fader.accessibility.value?.now).toBe(1);
    fireEvent.dblClick(fader);
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
    await render(<Handle />);
    const handle = screen.getByRole('adjustable', { name: 'Point' });
    fireEvent.pointerDown(handle, { clientX: 55, clientY: 45 });
    expect(x.get()).toBe(0.25);
    expect(y.get()).toBe(0.25);

    fireEvent.pointerMove(handle, { clientX: 155, clientY: 145 });
    expect(x.get()).toBe(1);
    expect(y.get()).toBe(0);
    fireEvent.pointerMove(handle, { clientX: 125, clientY: 115 });
    expect(x.get()).toBe(1);
    expect(y.get()).toBe(0);

    fireEvent.pointerMove(handle, { clientX: 95, clientY: 65 });
    expect(x.get()).toBeCloseTo(0.81);
    expect(y.get()).toBeCloseTo(0.09);
    fireEvent.pointerUp(handle);
    expect(x.endGesture).toHaveBeenCalledTimes(1);
    expect(y.endGesture).toHaveBeenCalledTimes(1);
  });

  test('the pad balances both gestures, supports keyboard adjustment and resets both axes', async () => {
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
    fireEvent.pointerDown(pad, { clientX: 140, clientY: 78 });
    expect(x.get()).toBeCloseTo(0.25);
    expect(y.get()).toBeCloseTo(0.25);
    fireEvent.pointerMove(pad, { clientX: 257, clientY: 23 });
    fireEvent.pointerUp(pad);
    expect(x.get()).toBe(1);
    expect(y.get()).toBe(1);
    expect(x.endGesture).toHaveBeenCalledTimes(1);
    expect(y.endGesture).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(pad, { key: 'ArrowDown' });
    expect(y.get()).toBeLessThan(1);
    fireEvent.dblClick(pad);
    expect(pad.accessibility.value?.text).toBe('Time 25%, Level 75%');
  });
});

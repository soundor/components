import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@soundor/testing-library/react';
import { useState } from 'react';
import type { UiNode } from 'soundor:ui';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { envelopeGeometry } from '../../headless';
import { EnvelopeEditor, type ADSREnvelope } from '../../index';
import { parameter } from '../../test-utils';
import { ThemeProvider } from '../../theme';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// A 440 × 200 plot without a title maps its values into x 70…412 and
// y 24…166: the plot area (56, 10, 370 × 170) less a 14-pixel safe zone.
const inner = { left: 70, top: 24, width: 342, height: 142 };
// One stage's whole travel across: the domain is 3.5 units wide.
const slot = inner.width / 3.5;
const at = (x: number, y: number) => ({
  x: inner.left + (x / 3.5) * inner.width,
  y: inner.top + inner.height * (1 - y),
});

type TestNode = ReturnType<typeof screen.getByRole>;
const handle = (name: string) => screen.getByRole('adjustable', { name });
/** Where a handle is drawn: the centre of its 26-pixel view. */
const centre = (node: TestNode) => ({
  x: Number(node.style.left) + 13,
  y: Number(node.style.top) + 13,
});
/** The layer over the plot that takes the pointer for the handles. */
const layer = () => handle('Attack').previousSibling as TestNode;

/** Where a pointer event on the layer is, at a point of the plot. */
const point = (at: { x: number; y: number }) => ({
  offsetX: at.x,
  offsetY: at.y,
  clientX: at.x,
  clientY: at.y,
});

/** A press on the layer at a point of the plot, dragged by (dx, dy), released. */
async function drag(
  from: { x: number; y: number },
  dx: number,
  dy: number,
  options: { cancel?: 'escape' | 'pointer'; shift?: boolean } = {},
) {
  const user = userEvent.setup();
  const target = layer();
  const to = { clientX: from.x + dx, clientY: from.y + dy };
  await user.pointer({ target, keys: '[MouseLeft>]', ...point(from) });
  if (options.shift) await user.keyboard('{Shift>}');
  await user.pointer(to);
  if (options.shift) await user.keyboard('{/Shift}');
  if (options.cancel === 'escape') await user.keyboard('{Escape}');
  // A cancelled pointer: no userEvent for it.
  if (options.cancel === 'pointer') fireEvent.pointerCancel(target);
  else await user.pointer({ keys: '[/MouseLeft]', ...to });
}

/**
 * A double-click on the layer over a handle; `between` runs before the
 * second release, which sends the dblclick.
 */
async function doubleClick(
  user: ReturnType<typeof userEvent.setup>,
  at: { x: number; y: number },
  between?: () => void,
) {
  const press = { target: layer(), ...point(at) };
  await user.pointer([
    press,
    { ...press, keys: '[MouseLeft]', detail: 1 },
    { ...press, keys: '[MouseLeft>]', detail: 2 },
  ]);
  between?.();
  await user.pointer({ ...press, keys: '[/MouseLeft]' });
}

// Linear times from 0 to 1 s: a position across a stage is its value.
const linear = { timeRange: [0, 1] as const, timeScale: 'linear' as const };

describe('envelope geometry', () => {
  test('stages follow each other, the sustain held for a fixed width, in a fixed domain', () => {
    const geometry = envelopeGeometry(
      { attack: 0.2, decay: 0.5, sustain: 0.6, release: 1 },
      0.5,
    );
    expect(geometry.domain).toEqual([0, 3.5]);
    expect(geometry.points).toEqual([
      [0, 0],
      [0.2, 1],
      [0.7, 0.6],
      [1.2, 0.6],
      [2.2, 0],
    ]);
    // Whatever the positions, the handles keep their order and the domain.
    for (const [a, d, r] of [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0.3],
    ] as const) {
      const xs = envelopeGeometry(
        { attack: a, decay: d, sustain: 0.5, release: r },
        0.5,
      ).points.map(([x]) => x);
      expect([...xs].sort((p, q) => p - q)).toEqual(xs);
      expect(xs.at(-1)).toBeLessThanOrEqual(3.5);
    }
  });
});

describe('EnvelopeEditor', () => {
  test('places each handle where its value maps, and names it with its value', async () => {
    await render(
      <EnvelopeEditor
        {...linear}
        defaultValue={{ attack: 0.25, decay: 0.5, sustain: 0.6, release: 0.75 }}
      />,
    );
    const expected = {
      Attack: at(0.25, 1),
      Decay: at(0.75, 0.6),
      Sustain: at(1.25, 0.6),
      Release: at(2, 0),
    };
    for (const [name, point] of Object.entries(expected)) {
      const node = handle(name);
      expect(centre(node).x).toBeCloseTo(point.x);
      expect(centre(node).y).toBeCloseTo(point.y);
    }
    expect(handle('Attack').accessibility.value?.text).toBe('250 ms');
    expect(handle('Decay').accessibility.value?.text).toBe(
      'Decay 500 ms, Sustain 60%',
    );
    expect(handle('Sustain').accessibility.value?.text).toBe('60%');
    expect(screen.getByRole('image', { name: 'Envelope' })).toBeDefined();
  });

  test('dragging each handle edits only its own stages, and the pointer maps back to values', async () => {
    const onChange = vi.fn<(value: ADSREnvelope) => void>();
    await render(
      <EnvelopeEditor
        {...linear}
        defaultValue={{ attack: 0.25, decay: 0.5, sustain: 0.6, release: 0.5 }}
        onChange={onChange}
      />,
    );
    await drag(centre(handle('Attack')), slot / 4, 30);
    expect(onChange).toHaveBeenLastCalledWith({
      attack: 0.5,
      decay: 0.5,
      sustain: 0.6,
      release: 0.5,
    });
    expect(handle('Attack').focused).toBe(true);

    await drag(centre(handle('Decay')), -slot / 10, -inner.height / 5);
    const after = onChange.mock.lastCall![0];
    expect(after.decay).toBeCloseTo(0.4);
    expect(after.sustain).toBeCloseTo(0.8);
    expect(after.attack).toBe(0.5);
    // The sustain handle follows the level the decay handle set.
    expect(handle('Sustain').accessibility.value?.text).toBe('80%');

    await drag(centre(handle('Sustain')), 200, inner.height / 2);
    expect(onChange.mock.lastCall![0].sustain).toBeCloseTo(0.3);
    expect(onChange.mock.lastCall![0].decay).toBeCloseTo(0.4);

    await drag(centre(handle('Release')), slot / 2, -80);
    expect(onChange.mock.lastCall![0].release).toBeCloseTo(1);
    // Past the end, it stays at the limit.
    await drag(centre(handle('Release')), slot, 0);
    expect(onChange.mock.lastCall![0].release).toBeCloseTo(1);
    await drag(centre(handle('Attack')), -slot * 2, 0);
    expect(onChange.mock.lastCall![0].attack).toBe(0);
  });

  test('bound parameters take host gestures only for the stages a handle edits', async () => {
    const attack = parameter(0.25);
    const decay = parameter(0.25);
    const sustain = parameter(0.5);
    const release = parameter(0.25);
    await render(
      <EnvelopeEditor
        parameters={{ attack, decay, sustain, release }}
        labels={{
          attack: 'Attack',
          decay: 'Decay',
          sustain: 'Sustain',
          release: 'Release',
        }}
      />,
    );
    const all = [attack, decay, sustain, release];
    const gestures = () => all.map((p) => p.beginGesture.mock.calls.length);

    await drag(centre(handle('Attack')), slot / 10, 0);
    expect(gestures()).toEqual([1, 0, 0, 0]);
    // The parameter's own mapping: position 0.5 + 0.1, squared.
    expect(attack.get()).toBeCloseTo(0.6 ** 2);
    expect(attack.endGesture).toHaveBeenCalledTimes(1);

    await drag(centre(handle('Release')), slot / 10, 0);
    expect(gestures()).toEqual([1, 0, 0, 1]);

    await drag(centre(handle('Sustain')), 0, -10);
    expect(gestures()).toEqual([1, 0, 1, 1]);

    // The decay handle moves two values, and takes both.
    await drag(centre(handle('Decay')), 10, -10);
    expect(gestures()).toEqual([1, 1, 2, 1]);
    expect(all.map((p) => p.endGesture.mock.calls.length)).toEqual([
      1, 1, 2, 1,
    ]);
    expect(attack.beginGesture).toHaveBeenCalledWith({ history: true });
  });

  test('a close press goes to the nearest handle, and overlapping ones stay reachable', async () => {
    await render(
      <EnvelopeEditor
        {...linear}
        defaultValue={{ attack: 0, decay: 0.02, sustain: 1, release: 0.5 }}
      />,
    );
    // Attack at (0, 1), decay about two pixels to its right at the same level.
    const a = centre(handle('Attack'));
    const d = centre(handle('Decay'));
    expect(d.x - a.x).toBeCloseTo(slot * 0.02);
    await drag({ x: a.x - 1, y: a.y }, slot / 10, 0);
    expect(handle('Attack').focused).toBe(true);
    expect(handle('Attack').accessibility.value?.text).toBe('100 ms');
    await drag({ x: d.x + slot / 10 + 1, y: d.y }, slot / 10, 0);
    expect(handle('Decay').focused).toBe(true);
    expect(handle('Decay').accessibility.value?.text).toBe(
      'Decay 120 ms, Sustain 100%',
    );
    // Away from every handle, a press does nothing.
    const before = handle('Attack').accessibility.value?.text;
    await drag({ x: inner.left + inner.width - 2, y: inner.top + 2 }, -40, 40);
    expect(handle('Attack').accessibility.value?.text).toBe(before);
  });

  test('keys edit the focused handle: arrows, Home and End, and the decay handle one stage per axis', async () => {
    const decay = parameter(0.25);
    const sustain = parameter(0.5);
    await render(
      <EnvelopeEditor
        {...linear}
        parameters={{ decay, sustain }}
        labels={{ decay: 'Decay', sustain: 'Sustain' }}
        defaultValue={{ attack: 0.1, decay: 0, sustain: 0, release: 0.3 }}
      />,
    );
    const user = userEvent.setup();
    handle('Attack').focus();
    await user.keyboard('{ArrowRight}');
    expect(handle('Attack').accessibility.value?.text).toBe('110 ms');
    await user.keyboard('{End}');
    expect(handle('Attack').accessibility.value?.text).toBe('1.00 s');
    await user.keyboard('{Home}');
    expect(handle('Attack').accessibility.value?.text).toBe('0 ms');

    handle('Decay').focus();
    await user.keyboard('{ArrowUp}');
    // Up moves the sustain only, and opens only its gesture.
    expect(sustain.beginGesture).toHaveBeenCalledTimes(1);
    expect(decay.beginGesture).not.toHaveBeenCalled();
    expect(sustain.get()).toBeCloseTo((Math.sqrt(0.5) + 0.01) ** 2);
    await user.keyboard('{ArrowRight}');
    expect(decay.beginGesture).toHaveBeenCalledTimes(1);
    // Moving to the other axis closed the first gesture.
    expect(sustain.endGesture).toHaveBeenCalledTimes(1);
    expect(decay.get()).toBeCloseTo(0.51 ** 2);

    // Double-click on D resets the decay only: the level is the sustain's,
    // which has its own handle, and its gesture is not opened.
    const sustainBefore = sustain.get();
    let sustainGestures = 0;
    let decayGestures = 0;
    // The presses grab the handle, and open both its gestures; the
    // dblclick, the decay's only.
    await doubleClick(user, centre(handle('Decay')), () => {
      sustainGestures = sustain.beginGesture.mock.calls.length;
      decayGestures = decay.beginGesture.mock.calls.length;
    });
    expect(decay.get()).not.toBeCloseTo(0.51 ** 2);
    expect(sustain.get()).toBe(sustainBefore);
    expect(decay.beginGesture).toHaveBeenCalledTimes(decayGestures + 1);
    expect(sustain.beginGesture).toHaveBeenCalledTimes(sustainGestures);

    // Alt-click on D resets as the double-click does: the decay only.
    handle('Decay').focus();
    await user.keyboard('{ArrowRight}');
    const changed = decay.get();
    const sustainAltGestures = sustain.beginGesture.mock.calls.length;
    await user.keyboard('{Alt>}');
    await user.pointer({
      target: layer(),
      keys: '[MouseLeft]',
      ...point(centre(handle('Decay'))),
    });
    await user.keyboard('{/Alt}');
    expect(decay.get()).not.toBe(changed);
    expect(decay.get()).toBe(decay.info.default);
    expect(sustain.get()).toBe(sustainBefore);
    expect(sustain.beginGesture).toHaveBeenCalledTimes(sustainAltGestures);

    // Delete on D resets the decay only, as a double-click does.
    await user.keyboard('{ArrowRight}');
    const sustainGesturesBefore = sustain.beginGesture.mock.calls.length;
    await user.keyboard('{Delete}');
    expect(decay.get()).toBe(decay.info.default);
    expect(sustain.get()).toBe(sustainBefore);
    expect(sustain.beginGesture).toHaveBeenCalledTimes(sustainGesturesBefore);

    // Double-click resets the stages of the handle under it.
    handle('Release').focus();
    await user.keyboard('{ArrowRight}');
    expect(handle('Release').accessibility.value?.text).toBe('310 ms');
    await doubleClick(user, centre(handle('Release')));
    expect(handle('Release').accessibility.value?.text).toBe('300 ms');
  });

  test('Escape cancels a drag back to the exact start; a cancelled pointer keeps the value', async () => {
    const release = parameter(0.3);
    await render(
      <EnvelopeEditor
        parameters={{ release }}
        labels={{ release: 'Release' }}
      />,
    );
    const start = release.get();
    await drag(centre(handle('Release')), slot / 3, 0, { cancel: 'escape' });
    expect(release.get()).toBe(start);
    expect(release.beginGesture).toHaveBeenCalledTimes(1);
    expect(release.endGesture).toHaveBeenCalledTimes(1);

    await drag(centre(handle('Release')), slot / 5, 0, { cancel: 'pointer' });
    expect(release.get()).toBeGreaterThan(start);
    expect(release.endGesture).toHaveBeenCalledTimes(2);
  });

  test('controlled, it shows what it is given; uncontrolled, both sustain handles share one value', async () => {
    function Controlled() {
      const [envelope, setEnvelope] = useState<ADSREnvelope>({
        attack: 0.02,
        decay: 0.3,
        sustain: 0.65,
        release: 0.8,
      });
      return (
        <>
          <EnvelopeEditor value={envelope} onChange={setEnvelope} />
          <EnvelopeEditor
            value={{ ...envelope, sustain: 0.1 }}
            labels={{ sustain: 'Fixed sustain' }}
            showValues={false}
          />
        </>
      );
    }
    await render(<Controlled />);
    const [own] = screen.getAllByRole('adjustable', { name: 'Sustain' });
    expect(own!.accessibility.value?.text).toBe('65%');
    expect(
      screen.getByRole('adjustable', { name: 'Fixed sustain' }).accessibility
        .value?.text,
    ).toBe('10%');
    own!.focus();
    await userEvent.setup().keyboard('{ArrowUp}');
    expect(own!.accessibility.value?.text).toBe('66%');
    // Its value is the parent's: the other editor, given the same, follows.
    const decays = screen.getAllByRole('adjustable', { name: 'Decay' });
    expect(decays[0]!.accessibility.value?.text).toBe(
      'Decay 300 ms, Sustain 66%',
    );
    // And keeps what it was given where the parent overrides it.
    expect(
      screen.getByRole('adjustable', { name: 'Fixed sustain' }).accessibility
        .value?.text,
    ).toBe('10%');
  });

  test('follows a resized display, and a theme of its own', async () => {
    let layout: ResizeObserverCallback | undefined;
    const observed: UiNode[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          layout = callback;
        }
        observe(node: UiNode) {
          observed.push(node);
        }
        disconnect() {}
      },
    );
    await render(
      <ThemeProvider theme={{ color: { coral: '#ff7a59' } }}>
        <EnvelopeEditor
          {...linear}
          color="coral"
          defaultValue={{ attack: 0.5, decay: 0.5, sustain: 0.5, release: 0.5 }}
        />
      </ThemeProvider>,
    );
    const before = centre(handle('Release'));
    const canvas = observed[0]!;
    Object.defineProperty(canvas, 'getContext', { value: () => null });
    await act(() => {
      layout?.(
        [
          {
            target: canvas,
            contentRect: {
              x: 0,
              y: 0,
              width: 640,
              height: 260,
              top: 0,
              left: 0,
              right: 640,
              bottom: 260,
            },
            borderBoxSize: [{ inlineSize: 640, blockSize: 260 }],
            contentBoxSize: [{ inlineSize: 640, blockSize: 260 }],
            devicePixelContentBoxSize: [{ inlineSize: 1280, blockSize: 520 }],
          },
        ],
        {} as ResizeObserver,
      );
    });
    const after = centre(handle('Release'));
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeGreaterThan(before.y);
    // A drag of a stage's travel still moves it by its whole range.
    const wide = (640 - 56 - 14 - 28) / 3.5;
    await drag(after, wide / 4, 0);
    expect(handle('Release').accessibility.value?.text).toBe('750 ms');
    // The handles take the theme's colour.
    const dot = handle('Release').children[1]!;
    expect(dot.style.backgroundColor).toBe('#ff7a59');
  });

  test('disabled, the handles take neither focus nor the pointer', async () => {
    const onChange = vi.fn<(value: ADSREnvelope) => void>();
    await render(<EnvelopeEditor disabled onChange={onChange} />);
    expect(handle('Attack').focusable).toBe(false);
    await drag(centre(handle('Attack')), 40, 0);
    expect(onChange).not.toHaveBeenCalled();
  });
});

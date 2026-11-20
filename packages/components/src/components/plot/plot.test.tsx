import {
  act,
  advanceTime,
  cleanup,
  render,
  screen,
  userEvent,
} from '@soundor/testing-library/react';
import { useState } from 'react';
import type { UiNode } from 'soundor:ui';
import { afterEach, expect, test, vi } from 'vitest';

import { Plot } from '../../index';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('Plot provides accessible draggable markers', async () => {
  const user = userEvent.setup();
  const onMove = vi.fn<(point: readonly [number, number]) => void>();
  function Fixture() {
    const [point, setPoint] = useState<readonly [number, number]>([0.5, 0.5]);
    return (
      <Plot
        width={260}
        height={160}
        series={[]}
        accessibilityLabel="Response"
        markers={[
          {
            x: point[0],
            y: point[1],
            label: 'Band 1',
            onMove: (next) => {
              onMove(next);
              setPoint(next);
            },
          },
        ]}
      />
    );
  }
  await render(<Fixture />);
  expect(screen.getByRole('image', { name: 'Response' })).toBeDefined();
  const marker = screen.getByRole('adjustable', { name: 'Band 1' });
  marker.focus();
  await user.keyboard('{ArrowRight}{ArrowUp}');
  expect(onMove).toHaveBeenLastCalledWith([0.51, 0.51]);
});

test('Plot keeps a marker at the end of an axis in reach, whatever its size', async () => {
  for (const [width, height] of [
    [261.3, 159.7],
    [440, 220],
    [333.33, 187.1],
  ] as const) {
    await render(
      <Plot
        width={width}
        height={height}
        series={[]}
        x={{ domain: [20, 20_000], scale: 'log' }}
        y={{ domain: [-12, 12] }}
        markers={[
          { x: 20_000, y: 12, label: 'Top right', onMove: () => {} },
          { x: 20, y: -12, label: 'Bottom left', onMove: () => {} },
        ]}
      />,
    );
    expect(screen.getByRole('adjustable', { name: 'Top right' })).toBeDefined();
    expect(
      screen.getByRole('adjustable', { name: 'Bottom left' }),
    ).toBeDefined();
    await cleanup();
  }
});

test('Plot redraws a resized high-DPI buffer and coalesces incoming series frames', async () => {
  let observed: UiNode | undefined;
  let layout: ResizeObserverCallback | undefined;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        layout = callback;
      }
      observe(node: UiNode) {
        observed = node;
      }
      disconnect() {}
    },
  );
  let publish = () => {};
  const source = {
    get: vi.fn<() => { values: Float32Array }[]>(() => [
      { values: new Float32Array([0, 1]) },
    ]),
    subscribe: vi.fn<(invalidate: () => void) => () => void>((invalidate) => {
      publish = invalidate;
      return () => {
        publish = () => {};
      };
    }),
  };
  await render(
    <Plot width={260} height={160} series={[{}]} seriesSource={source} />,
  );
  expect(observed).toBeDefined();
  const clearRect =
    vi.fn<(x: number, y: number, width: number, height: number) => void>();
  const setTransform = vi.fn<(...matrix: number[]) => void>();
  const ctx = {
    clearRect,
    setTransform,
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    rect() {},
    clip() {},
    setLineDash() {},
    fillRect() {},
    fillText() {},
    measureText: () => ({ width: 5 }),
  };
  Object.defineProperty(observed, 'getContext', { value: () => ctx });
  const resize = (width: number, height: number, scale: number) =>
    act(() => {
      layout?.(
        [
          {
            target: observed!,
            contentRect: {
              x: 0,
              y: 0,
              width,
              height,
              top: 0,
              left: 0,
              right: width,
              bottom: height,
            },
            borderBoxSize: [{ inlineSize: width, blockSize: height }],
            contentBoxSize: [{ inlineSize: width, blockSize: height }],
            devicePixelContentBoxSize: [
              { inlineSize: width * scale, blockSize: height * scale },
            ],
          },
        ],
        {} as ResizeObserver,
      );
    });
  await resize(260, 160, 2);
  expect(observed!.width).toBe(520);
  expect(setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
  await resize(330, 180, 1.5);
  expect(observed!.width).toBe(495);
  expect(clearRect).toHaveBeenLastCalledWith(0, 0, 330, 180);
  source.get.mockClear();
  publish();
  publish();
  publish();
  await advanceTime(20);
  expect(source.get).toHaveBeenCalledTimes(1);
  expect(source.subscribe).toHaveBeenCalledTimes(1);
});

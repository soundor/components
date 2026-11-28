import {
  act,
  advanceTime,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@soundor/testing-library/react';
import { Profiler, useState, type ReactNode } from 'react';
import type { PointerEvent } from 'soundor:ui';
import { afterEach, expect, test, vi } from 'vitest';

import { Plot, usePlotCoordinates, type PlotSamples } from '../../index';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Point = readonly [number, number];

/**
 * A canvas that draws: the simulated runtime has no layout and no 2D
 * context, so a ResizeObserver reports the size and a context records the
 * colours series and markers are drawn in.
 */
function stubCanvas() {
  const observers = new Map<unknown, ResizeObserverCallback>();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(node: unknown) {
        observers.set(node, this.callback);
      }
      unobserve() {}
      disconnect() {}
    },
  );
  const strokes: string[] = [];
  const calls = { clearRect: [] as number[][], setTransform: [] as number[][] };
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return () => ({ width: 5 });
      if (key === 'clearRect' || key === 'setTransform')
        return (...args: number[]) => calls[key].push(args);
      return () => {};
    },
    set(target, key, value) {
      if (key === 'strokeStyle') strokes.push(String(value));
      target[key] = value;
      return true;
    },
  });
  const canvas = () => screen.getByRole('image');
  const resize = (width: number, height: number, scale = 1) =>
    act(() => {
      const node = canvas();
      Object.defineProperty(node, 'getContext', {
        value: () => ctx,
        configurable: true,
      });
      observers.get(node)?.(
        [
          {
            target: node,
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
        ] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      );
    });
  return { calls, strokes, resize };
}

function liveSource<T>(initial: T) {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: vi.fn(() => current),
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    publish(next: T) {
      current = next;
      for (const listener of listeners) listener();
    },
    listeners,
  };
}

test('Plot provides accessible draggable markers', async () => {
  const user = userEvent.setup();
  const onMove = vi.fn<(point: Point) => void>();
  function Fixture() {
    const [point, setPoint] = useState<Point>([0.5, 0.5]);
    return (
      <Plot width={260} height={160} accessibilityLabel="Response">
        <Plot.XAxis domain={[0, 1]} />
        <Plot.YAxis domain={[0, 1]} />
        <Plot.Marker
          x={point[0]}
          y={point[1]}
          label="Band 1"
          onMove={(next) => {
            onMove(next);
            setPoint(next);
          }}
        />
      </Plot>
    );
  }
  await render(<Fixture />);
  expect(screen.getByRole('image', { name: 'Response' })).toBeDefined();
  const marker = screen.getByRole('adjustable', { name: 'Band 1' });
  marker.focus();
  await user.keyboard('{ArrowRight}{ArrowUp}');
  expect(onMove).toHaveBeenLastCalledWith([0.51, 0.51]);
});

test('marker locks an axis, composes discrete actions, and keeps removal application-owned', async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  const onSelect = vi.fn();
  const onRemove = vi.fn();
  const onWheel = vi.fn();
  await render(
    <Plot width={260} height={160}>
      <Plot.XAxis domain={[0, 1]} />
      <Plot.YAxis domain={[0, 1]} />
      <Plot.Marker
        x={0.5}
        y={0.5}
        movement="x"
        selected
        accessibilityLabel="Trim point"
        onMove={onMove}
        onSelect={onSelect}
        onRemove={onRemove}
        onWheel={onWheel}
      />
    </Plot>,
  );
  const marker = screen.getByRole('adjustable', { name: 'Trim point' });
  await user.tab();
  expect(marker.accessibility.state?.selected).toBe(true);
  await user.keyboard('{ArrowUp}');
  expect(onMove).not.toHaveBeenCalled();
  await user.keyboard('{ArrowRight}');
  expect(onMove).toHaveBeenLastCalledWith([0.51, 0.5]);
  await user.keyboard('{Enter}{Delete}');
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onRemove).toHaveBeenCalledTimes(1);
  await user.wheel(marker, { deltaY: -10 });
  expect(onWheel).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('adjustable', { name: 'Trim point' })).toBe(marker);
});

test('Plot keeps a marker at the end of an axis in reach, whatever its size', async () => {
  for (const [width, height] of [
    [261.3, 159.7],
    [440, 220],
    [333.33, 187.1],
  ] as const) {
    await render(
      <Plot width={width} height={height}>
        <Plot.XAxis domain={[20, 20_000]} scale="log" />
        <Plot.YAxis domain={[-12, 12]} />
        <Plot.Marker x={20_000} y={12} label="Top right" onMove={() => {}} />
        <Plot.Marker x={20} y={-12} label="Bottom left" onMove={() => {}} />
      </Plot>,
    );
    expect(screen.getByRole('adjustable', { name: 'Top right' })).toBeDefined();
    expect(
      screen.getByRole('adjustable', { name: 'Bottom left' }),
    ).toBeDefined();
    await cleanup();
  }
});

test('unlabelled draggable markers are numbered in the order they are drawn; plain ones are not controls', async () => {
  await render(
    <Plot width={260} height={160}>
      <Plot.XAxis domain={[0, 1]} />
      <Plot.YAxis domain={[0, 1]} />
      <Plot.Marker x={0.2} y={0.2} onMove={() => {}} />
      <Plot.Marker x={0.4} y={0.4} />
      <Plot.HorizontalLine value={0.5} label="0 dB" />
      <Plot.VerticalLine value={0.5} />
      <Plot.Marker x={0.6} y={0.6} onMove={() => {}} />
    </Plot>,
  );
  expect(
    screen.getAllByRole('adjustable').map((node) => node.accessibility.label),
  ).toEqual(['Point 1', 'Point 2']);
});

test('a marker drag starts and ends its gesture, also when the pointer is cancelled', async () => {
  const onMoveStart = vi.fn();
  const onMoveEnd = vi.fn();
  const onMove = vi.fn();
  const onMoveCancel = vi.fn();
  await render(
    <Plot width={260} height={160}>
      <Plot.Marker
        x={0.5}
        y={0.5}
        label="Playhead"
        onMove={onMove}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onMoveCancel={onMoveCancel}
      />
    </Plot>,
  );
  const user = userEvent.setup();
  const marker = screen.getByRole('adjustable', { name: 'Playhead' });
  // No layout here: the handle's box, as a runtime would report it.
  for (const node of [marker, marker.parent!])
    Object.defineProperty(node, 'getBoundingClientRect', {
      value: () => ({ x: 88, y: 68, width: 24, height: 24 }),
    });
  let pointer = -1;
  marker.addEventListener('pointerdown', (event) => {
    pointer = (event as unknown as PointerEvent).pointerId;
  });
  await user.click(marker);
  expect(onMoveStart).not.toHaveBeenCalled();
  expect(onMoveEnd).not.toHaveBeenCalled();
  await user.pointer([
    { target: marker, keys: '[MouseLeft>]', clientX: 100, clientY: 80 },
    { clientX: 120, clientY: 80 },
  ]);
  expect(onMoveStart).toHaveBeenCalledTimes(1);
  await fireEvent.pointerCancel(marker, { pointerId: pointer });
  expect(onMoveEnd).toHaveBeenCalledTimes(1);
  expect(onMoveCancel).toHaveBeenCalledTimes(1);
  expect(onMove).toHaveBeenLastCalledWith([0.5, 0.5]);
});

test.each([
  { multiple: true, rectangle: false },
  { multiple: false, rectangle: true },
])(
  'leaves custom background drags in charge without multiple rectangle selection (%j)',
  async (config) => {
    const onSelectionChange = vi.fn();
    const onBackgroundDrag = vi.fn();
    const onBackgroundPress = vi.fn();
    await render(
      <Plot
        width={260}
        height={160}
        selection={{ ...config, selectedIds: ['a'], onSelectionChange }}
        onBackgroundDrag={onBackgroundDrag}
        onBackgroundPress={onBackgroundPress}
      >
        <Plot.Marker id="a" x={0.5} y={0.5} />
      </Plot>,
    );
    const target = screen.getByRole('image').nextSibling!;
    Object.defineProperty(target.parent!, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 260, height: 160 }),
    });
    const user = userEvent.setup();
    await user.pointer([
      { target, keys: '[MouseLeft>]', clientX: 20, clientY: 20 },
      { clientX: 140, clientY: 90 },
      { keys: '[/MouseLeft]' },
    ]);
    expect(onBackgroundDrag.mock.calls.map(([event]) => event.phase)).toEqual([
      'start',
      'move',
      'end',
    ]);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onBackgroundPress).not.toHaveBeenCalled();
    await user.click(target);
    expect(onSelectionChange).toHaveBeenCalledWith([]);
    expect(onBackgroundPress).toHaveBeenCalledTimes(1);
  },
);

test('without axes, the domain is the static data’s extent', async () => {
  const onMove = vi.fn<(point: Point) => void>();
  await render(
    <Plot width={260} height={160}>
      <Plot.Line
        points={[
          [0, 0],
          [100, 10],
        ]}
      />
      <Plot.Marker x={50} y={5} label="Mid" onMove={onMove} />
    </Plot>,
  );
  const user = userEvent.setup();
  screen.getByRole('adjustable', { name: 'Mid' }).focus();
  // A step is a hundredth of each axis: 1 across, 0.1 up.
  await user.keyboard('{ArrowRight}{ArrowUp}');
  expect(onMove.mock.lastCall![0][0]).toBeCloseTo(51);
  expect(onMove.mock.lastCall![0][1]).toBeCloseTo(5.1);
});

test('series draw in tree order, whatever order they mount in, through components and conditions of yours', async () => {
  const canvas = stubCanvas();
  const line = (color: string) => (
    <Plot.Line
      color={color}
      points={[
        [0, 0],
        [1, 1],
      ]}
    />
  );
  function Spectrum({ shown }: { shown: boolean }) {
    return shown ? line('#000002') : null;
  }
  function Fixture({ shown }: { shown: boolean }) {
    return (
      <Plot width={260} height={160}>
        {line('#000001')}
        <Spectrum shown={shown} />
        <>{line('#000003')}</>
      </Plot>
    );
  }
  const colors = ['#000001', '#000002', '#000003'];
  const { rerender } = await render(<Fixture shown={false} />);
  await canvas.resize(260, 160);
  canvas.strokes.length = 0;
  // Mounted last, but between the others in the tree.
  await rerender(<Fixture shown />);
  await advanceTime(20);
  const frame = canvas.strokes.filter((color) => colors.includes(color));
  expect(frame.slice(-3)).toEqual(colors);

  // Taken away: no longer drawn.
  canvas.strokes.length = 0;
  await rerender(<Fixture shown={false} />);
  await advanceTime(20);
  expect(canvas.strokes).not.toContain('#000002');
  expect(
    canvas.strokes.filter((color) => colors.includes(color)).slice(-2),
  ).toEqual(['#000001', '#000003']);
});

test('markers and guide lines draw over every series', async () => {
  const canvas = stubCanvas();
  await render(
    <Plot width={260} height={160}>
      <Plot.VerticalLine value={0.5} color="#00000a" />
      <Plot.Line
        color="#000001"
        points={[
          [0, 0],
          [1, 1],
        ]}
      />
    </Plot>,
  );
  await canvas.resize(260, 160);
  const order = canvas.strokes.filter(
    (c) => c === '#000001' || c === '#00000a',
  );
  expect(order.slice(-2)).toEqual(['#000001', '#00000a']);
});

test('the legend lists labelled series in order, and follows them coming and going', async () => {
  function Fixture({ output }: { output: boolean }) {
    return (
      <Plot width={260} height={160} title="Spectrum">
        <Plot.Legend />
        <Plot.Area label="Input" values={[0, 1]} />
        {output && <Plot.Line label="Output" values={[1, 0]} />}
        <Plot.Line values={[0.5, 0.5]} />
      </Plot>
    );
  }
  const { rerender } = await render(<Fixture output={false} />);
  expect(screen.queryByText('INPUT')).not.toBeNull();
  expect(screen.queryByText('OUTPUT')).toBeNull();
  await rerender(<Fixture output />);
  expect(screen.queryByText('OUTPUT')).not.toBeNull();
  await rerender(<Fixture output={false} />);
  expect(screen.queryByText('OUTPUT')).toBeNull();
});

test('a resized high-DPI buffer redraws, and live sources draw once a frame with no React render', async () => {
  const canvas = stubCanvas();
  const input = liveSource<PlotSamples>({ values: new Float32Array([0, 1]) });
  const output = liveSource<PlotSamples>({
    points: [
      [0, 1],
      [1, 0],
    ],
  });
  const renders = vi.fn();
  await render(
    <Profiler id="plot" onRender={renders}>
      <Plot width={260} height={160}>
        <Plot.XAxis id="frequency" scale="log" domain={[20, 20000]} />
        <Plot.YAxis id="response" domain={[-12, 12]} />
        <Plot.YAxis id="spectrum" domain={[-90, 0]} position="right" />
        <Plot.Area source={input} xAxis="frequency" yAxis="spectrum" />
        <Plot.Line source={output} xAxis="frequency" yAxis="response" />
      </Plot>
    </Profiler>,
  );
  await canvas.resize(260, 160, 2);
  expect(screen.getByRole('image').width).toBe(520);
  expect(canvas.calls.setTransform.at(-1)).toEqual([2, 0, 0, 2, 0, 0]);
  await canvas.resize(330, 180, 1.5);
  expect(screen.getByRole('image').width).toBe(495);
  expect(canvas.calls.clearRect.at(-1)).toEqual([0, 0, 330, 180]);

  input.get.mockClear();
  output.get.mockClear();
  renders.mockClear();
  // A burst of updates from both: one frame, each read once.
  input.publish({ values: new Float32Array([1, 0]) });
  output.publish({ values: new Float32Array([0.5]) });
  input.publish({ values: new Float32Array([0, 0]) });
  await advanceTime(20);
  expect(input.get).toHaveBeenCalledTimes(1);
  expect(output.get).toHaveBeenCalledTimes(1);
  expect(renders).not.toHaveBeenCalled();
  expect(input.subscribe).toHaveBeenCalledTimes(1);
  expect(output.subscribe).toHaveBeenCalledTimes(1);
});

test('a series unsubscribes from a source it no longer has, and as it unmounts', async () => {
  const first = liveSource<PlotSamples>({ values: [0, 1] });
  const second = liveSource<PlotSamples>({ values: [1, 0] });
  const fixture = (source?: typeof first) => (
    <Plot width={260} height={160}>
      {source && <Plot.Line source={source} />}
    </Plot>
  );
  const { rerender } = await render(fixture(first));
  expect(first.listeners.size).toBe(1);
  await rerender(fixture(second));
  expect(first.listeners.size).toBe(0);
  expect(second.listeners.size).toBe(1);
  await rerender(fixture());
  expect(second.listeners.size).toBe(0);
});

test('named axes share the plot bounds with independent scales, including a hidden axis', async () => {
  const inspect = vi.fn();
  function Probe() {
    const response = usePlotCoordinates({
      xAxis: 'frequency',
      yAxis: 'response',
    });
    const spectrum = usePlotCoordinates({
      xAxis: 'frequency',
      yAxis: 'spectrum',
    });
    const missing = usePlotCoordinates({ yAxis: 'missing' });
    inspect(response, spectrum, missing);
    return null;
  }
  const fixture = (range: number) => (
    <Plot width={360} height={180}>
      <Plot.YAxis id="response" domain={[-range, range]} />
      <Plot.YAxis id="spectrum" position="right" hidden domain={[-90, 0]} />
      <Plot.XAxis id="frequency" domain={[20, 20000]} scale="log" />
      <Probe />
    </Plot>
  );
  const { rerender } = await render(fixture(12));
  let [response, spectrum, missing] = inspect.mock.lastCall!;
  expect(response.rect).toBe(spectrum.rect);
  expect(missing).toBeUndefined();
  expect(response.x.map(20 * Math.sqrt(1000))).toBeCloseTo(
    response.rect.left + response.rect.width / 2,
  );
  expect(Number.isFinite(response.x.map(0))).toBe(false);
  expect(response.y.map(0)).toBeCloseTo(spectrum.y.map(-45));
  expect(spectrum.y.invert(response.y.map(12))).toBeCloseTo(0);
  await rerender(fixture(24));
  [response, spectrum] = inspect.mock.lastCall!;
  expect(spectrum.y.invert(response.y.map(12))).toBeCloseTo(-22.5);
});

test('parts of your own get the plot’s coordinates, and render over the canvas', async () => {
  let seen: ReturnType<typeof usePlotCoordinates> | undefined;
  function Handles({ children }: { children?: ReactNode }) {
    seen = usePlotCoordinates();
    return <>{children}</>;
  }
  await render(
    <Plot width={260} height={160} safeZone={10}>
      <Plot.XAxis domain={[0, 10]} />
      <Plot.YAxis domain={[0, 1]} />
      <Handles>
        <Plot.Marker x={5} y={0.5} label="Inner" onMove={() => {}} />
      </Handles>
    </Plot>,
  );
  expect(seen).toBeDefined();
  // Mapped inside the safe zone.
  expect(seen!.x.map(0)).toBe(seen!.inner.left);
  expect(seen!.inner.left - seen!.rect.left).toBe(13);
  expect(screen.getByRole('adjustable', { name: 'Inner' })).toBeDefined();
});

test('autoSafeZone={false} maps the axes to the frame past a draggable marker', async () => {
  let seen: ReturnType<typeof usePlotCoordinates> | undefined;
  function Inspect() {
    seen = usePlotCoordinates();
    return null;
  }
  const fixture = (safeZone?: number) => (
    <Plot width={260} height={160} autoSafeZone={false} safeZone={safeZone}>
      <Plot.XAxis domain={[0, 10]} />
      <Plot.YAxis domain={[0, 1]} />
      <Plot.Marker x={5} y={0.5} label="Band" onMove={() => {}} />
      <Inspect />
    </Plot>
  );
  const { rerender } = await render(fixture());
  expect(seen!.inner.left).toBe(seen!.rect.left);
  expect(seen!.x.map(10)).toBe(seen!.rect.left + seen!.rect.width);
  expect(screen.getByRole('adjustable', { name: 'Band' })).toBeDefined();
  // Its own safeZone still applies.
  await rerender(fixture(6));
  expect(seen!.inner.left - seen!.rect.left).toBe(6);
});

test('axisLabelGap gives the axes more room', async () => {
  let seen: ReturnType<typeof usePlotCoordinates> | undefined;
  function Inspect() {
    seen = usePlotCoordinates();
    return null;
  }
  const fixture = (axisLabelGap?: number) => (
    <Plot width={400} height={200} axisLabelGap={axisLabelGap}>
      <Plot.XAxis domain={[0, 10]} />
      <Plot.YAxis domain={[0, 1]} />
      <Inspect />
    </Plot>
  );
  const { rerender } = await render(fixture());
  const room = (rect: { top: number; height: number }) =>
    200 - rect.top - rect.height;
  expect(seen!.rect.left).toBe(56);
  expect(room(seen!.rect)).toBe(20);
  await rerender(fixture(30));
  expect(seen!.rect.left).toBe(70);
  expect(room(seen!.rect)).toBe(50);
});

test('what TypeScript cannot rule out is refused at run time', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const both = { points: [[0, 0]], values: [0] } as const;
  await expect(
    render(
      <Plot width={100} height={100}>
        <Plot.Line {...(both as unknown as { values: number[] })} />
      </Plot>,
    ),
  ).rejects.toThrow('Plot.Line takes one of points, values or source.');
  await expect(
    render(
      <Plot width={100} height={100}>
        <Plot.Band
          {...({ lower: [[0, 0]] } as unknown as {
            lower: Point[];
            upper: Point[];
          })}
        />
      </Plot>,
    ),
  ).rejects.toThrow('Plot.Band takes lower and upper, or a source.');
  await expect(
    render(
      <Plot width={100} height={100}>
        <Plot.XAxis domain={[0, 1]} />
        <Plot.XAxis domain={[0, 2]} />
      </Plot>,
    ),
  ).rejects.toThrow('A Plot takes one Plot.XAxis.');
  await expect(render(<Plot.Line values={[0, 1]} />)).rejects.toThrow(
    'Plot.Line belongs inside a Plot.',
  );
});

// Never run: compiled, so the type checker holds each series to its own props.
export function contracts(source: {
  line: import('../../index').PlotSource<PlotSamples>;
  band: import('../../index').PlotSource<import('../../index').PlotBandSamples>;
}) {
  return (
    <Plot width={100} height={100}>
      <Plot.Line points={[[0, 1]]} strokeWidth={2} dash={[2, 2]} extend />
      <Plot.Area values={new Float32Array(4)} baseline={-90} />
      <Plot.Bars source={source.line} baseline={0} />
      <Plot.Points points={[[0, 1]]} radius={2} />
      <Plot.Band source={source.band} />
      {/* @ts-expect-error points and values are one or the other */}
      <Plot.Line points={[[0, 1]]} values={[1]} />
      {/* @ts-expect-error data is required */}
      <Plot.Line label="Empty" />
      {/* @ts-expect-error a band needs both of its edges */}
      <Plot.Band lower={[[0, 1]]} />
      {/* @ts-expect-error a band's source has edges, not samples */}
      <Plot.Band source={source.line} />
      {/* @ts-expect-error a line's source has samples, not edges */}
      <Plot.Line source={source.band} />
      {/* @ts-expect-error bars have no stroke */}
      <Plot.Bars values={[1]} strokeWidth={2} />
      {/* @ts-expect-error a line has no dots */}
      <Plot.Line values={[1]} radius={2} />
      {/* @ts-expect-error a marker has both coordinates */}
      <Plot.Marker x={1} />
      {/* @ts-expect-error a move is given a point */}
      <Plot.Marker x={1} y={1} onMove={(x: number) => x} />
    </Plot>
  );
}

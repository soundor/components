import { afterEach, expect, test, vi } from 'vitest';

import { anchorBox, watchAnchor, type PopupRegion } from './anchor';
import { computePlacement, type PlacementOptions } from './placement';

afterEach(() => vi.unstubAllGlobals());

test('points have zero extent; rectangular anchors keep their extent', () => {
  expect(anchorBox({ x: 8, y: 10 })).toEqual({
    x: 8,
    y: 10,
    width: 0,
    height: 0,
  });
  const box = { x: 8, y: 10, width: 100, height: 40 };
  expect(anchorBox(box)).toEqual(box);
  expect(anchorBox({ x: Infinity, y: 10 })).toBeNull();
});

test('tracks moving and resized regions, suppresses unchanged frames, and cancels on disposal', () => {
  let frame: (() => void) | undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    frame = callback;
    return 7;
  });
  const cancel = vi.fn();
  vi.stubGlobal('cancelAnimationFrame', cancel);
  let region: PopupRegion | null = null;
  const options: PlacementOptions = {
    side: 'bottom',
    align: 'end',
    offset: 4,
    alignOffset: 0,
    flip: true,
    padding: 4,
    scale: 2,
  };
  const place = vi.fn(
    (box: ReturnType<typeof anchorBox>) =>
      box &&
      computePlacement(
        box,
        { width: 40, height: 30 },
        { x: 0, y: 0, width: 200, height: 150 },
        options,
      ),
  );
  const stop = watchAnchor({ getRegion: () => region }, place);
  region = { x: 60, y: 20, width: 40, height: 10 };
  frame?.();
  expect(place.mock.results[0]?.value).toMatchObject({
    x: 60,
    y: 34,
    side: 'bottom',
  });
  frame?.();
  expect(place).toHaveBeenCalledTimes(1);
  region = { x: 80, y: 120, width: 40, height: 10 };
  frame?.();
  expect(place.mock.results[1]?.value).toMatchObject({
    x: 80,
    y: 86,
    side: 'top',
  });
  region = { ...region, width: 60 };
  frame?.();
  expect(place.mock.results[2]?.value).toMatchObject({ x: 100, y: 86 });
  region = null;
  frame?.();
  expect(place).toHaveBeenLastCalledWith(null);
  stop?.();
  expect(cancel).toHaveBeenCalledExactlyOnceWith(7);
});

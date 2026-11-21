import { describe, expect, test } from 'vitest';

import {
  computePlacement,
  samePlacement,
  type PlacementOptions,
} from './placement';

const view = { x: 0, y: 0, width: 400, height: 300 };
const options: PlacementOptions = {
  side: 'bottom',
  align: 'start',
  offset: 4,
  alignOffset: 0,
  padding: 4,
  flip: true,
  scale: 1,
};
const field = { x: 40, y: 20, width: 120, height: 30 };

describe('popup placement', () => {
  test('sits on its side of the anchor, aligned to its start, centre or end', () => {
    const size = { width: 100, height: 80 };
    expect(computePlacement(field, size, view, options)).toMatchObject({
      x: 40,
      y: 54,
      side: 'bottom',
    });
    expect(
      computePlacement(field, size, view, { ...options, align: 'center' }).x,
    ).toBe(50);
    expect(
      computePlacement(field, size, view, { ...options, align: 'end' }).x,
    ).toBe(60);
    const right = computePlacement(field, size, view, {
      ...options,
      side: 'right',
      alignOffset: 3,
    });
    expect(right).toMatchObject({ x: 164, y: 23, side: 'right' });
  });

  test('flips to the other side only when it is short of room there and the other has more', () => {
    const low = { x: 40, y: 230, width: 120, height: 30 };
    const size = { width: 100, height: 80 };
    const flipped = computePlacement(low, size, view, options);
    expect(flipped.side).toBe('top');
    expect(flipped.y).toBe(230 - 4 - 80);
    expect(
      computePlacement(low, size, view, { ...options, flip: false }).side,
    ).toBe('bottom');
    // Short of room on both sides: the one with more, and a height to scroll in.
    const tall = computePlacement(
      { x: 40, y: 120, width: 120, height: 30 },
      { width: 100, height: 400 },
      view,
      options,
    );
    expect(tall.side).toBe('bottom');
    expect(tall.maxHeight).toBe(300 - 150 - 8);
    expect(tall.y + tall.maxHeight).toBeLessThanOrEqual(300 - 4);
    // Measured again at that height, it stays where it is: no flip back.
    const again = computePlacement(
      { x: 40, y: 120, width: 120, height: 30 },
      { width: 100, height: tall.maxHeight },
      view,
      options,
    );
    expect(samePlacement(tall, again)).toBe(true);
  });

  test('is held inside the bounds, whatever the anchor', () => {
    const size = { width: 160, height: 100 };
    // A context menu at the bottom-right corner.
    const corner = computePlacement(
      { x: 395, y: 298, width: 0, height: 0 },
      size,
      view,
      options,
    );
    expect(corner.side).toBe('top');
    expect(corner.x).toBe(400 - 4 - 160);
    expect(corner.y).toBe(298 - 4 - 100);
    // An anchor scrolled out of view to the left.
    const off = computePlacement(
      { x: -80, y: 20, width: 60, height: 20 },
      size,
      view,
      options,
    );
    expect(off.x).toBe(4);
    // A popup wider than the view is as wide as it can be.
    const wide = computePlacement(
      field,
      { width: 900, height: 50 },
      view,
      options,
    );
    expect(wide.x).toBe(4);
    expect(wide.maxWidth).toBe(392);
  });

  test('keeps to a safe area that is not the whole view', () => {
    const safe = { x: 50, y: 40, width: 300, height: 200 };
    const placed = computePlacement(
      { x: 20, y: 30, width: 0, height: 0 },
      { width: 100, height: 60 },
      safe,
      options,
    );
    expect(placed.x).toBe(54);
    expect(placed.y).toBe(44);
  });

  test('lands on whole device pixels at any display scale', () => {
    const anchor = { x: 10.3, y: 10.3, width: 33.33, height: 20.2 };
    for (const scale of [1, 1.25, 1.5, 2]) {
      const placed = computePlacement(anchor, { width: 50, height: 50 }, view, {
        ...options,
        scale,
        align: 'center',
      });
      expect(Number.isInteger(Math.round(placed.x * scale * 1e9) / 1e9)).toBe(
        true,
      );
      expect(Number.isInteger(Math.round(placed.y * scale * 1e9) / 1e9)).toBe(
        true,
      );
    }
  });

  test('takes the edge padding rather than scroll when it is short by no more', () => {
    // 242 below the field, between its offset and the view's padding.
    const near = computePlacement(
      field,
      { width: 100, height: 245 },
      view,
      options,
    );
    expect(near).toMatchObject({ y: 54, side: 'bottom', maxHeight: 246 });
    const far = computePlacement(
      field,
      { width: 100, height: 247 },
      view,
      options,
    );
    expect(far).toMatchObject({ y: 54, side: 'bottom', maxHeight: 242 });
    // Above an anchor near the bottom: up to the top edge, not past it.
    const low = { x: 40, y: 250, width: 120, height: 30 };
    const above = computePlacement(low, { width: 100, height: 244 }, view, {
      ...options,
      side: 'top',
    });
    expect(above).toMatchObject({ y: 2, side: 'top', maxHeight: 246 });
    // Only along the side: across it, the padding stays.
    const wide = computePlacement(
      field,
      { width: 395, height: 80 },
      view,
      options,
    );
    expect(wide.x).toBe(4);
    expect(wide.maxWidth).toBe(392);
  });
});

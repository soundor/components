import { describe, expect, test } from 'vitest';

import {
  aimTriangle,
  createSubmenuAim,
  inTriangle,
  submenuSide,
  type AimDecision,
  type AimPoint,
} from './submenu-aim';

// A parent menu from x 0 to 200 with rows 24 high from y 4. The trigger is
// its second row; the submenu opens on its right, its first row level with
// the trigger.
const trigger = { x: 4, y: 28, width: 192, height: 24 };
const right = { x: 200, y: 24, width: 160, height: 200 };
// The same menu at x 300 to 500, with the submenu flipped to its left.
const flippedTrigger = { x: 304, y: 28, width: 192, height: 24 };
const left = { x: 140, y: 24, width: 160, height: 200 };

type Step = [x: number, y: number, time: number];

function run(
  steps: Step[],
  rows = trigger,
  submenu = right,
  options?: Parameters<typeof createSubmenuAim>[0],
) {
  const aim = createSubmenuAim(options);
  const decisions: AimDecision[] = steps.map(([x, y, time]) =>
    aim.move({ x, y }, time, rows, submenu),
  );
  return { aim, decisions };
}

describe('submenu aim', () => {
  test('a fast move straight at the submenu, across the next row, stays', () => {
    const { decisions } = run([
      [150, 40, 0],
      [165, 46, 8],
      // Over the third row (y 52 to 76) on the way.
      [180, 54, 16],
      [195, 60, 24],
      [205, 64, 32],
    ]);
    expect(decisions).toEqual(['stay', 'stay', 'stay', 'stay', 'stay']);
  });

  test('a slow diagonal move down the menu switches', () => {
    const { decisions } = run([
      [150, 40, 0],
      [152, 56, 40],
      [154, 72, 80],
    ]);
    expect(decisions).toEqual(['stay', 'stay', 'switch']);
  });

  test('a creep towards the submenu, too slow to be aiming at it, switches', () => {
    const steps: Step[] = [[150, 40, 0]];
    // 1 px every 20 ms: 0.05 px/ms, inside the triangle all the way.
    for (let i = 1; i <= 8; i++) steps.push([150 + i, 52 + i, i * 20]);
    const { decisions } = run(steps);
    expect(decisions.slice(0, 5)).toEqual([
      'stay',
      'stay',
      'stay',
      'stay',
      'stay',
    ]);
    // 100 ms without progress, at 100 ms.
    expect(decisions[5]).toBe('switch');
  });

  test('resting on another row switches after the rest delay', () => {
    const { aim, decisions } = run([
      [150, 40, 0],
      [170, 56, 10],
    ]);
    expect(decisions).toEqual(['stay', 'stay']);
    expect(aim.deadline()).toBe(110);
    expect(aim.check(60)).toBe('stay');
    expect(aim.check(109)).toBe('stay');
    expect(aim.check(110)).toBe('switch');
    expect(aim.decision()).toBe('switch');
  });

  test('a move back, away from the submenu, switches', () => {
    const { decisions } = run([
      [150, 40, 0],
      [170, 54, 8],
      [176, 56, 16],
      // 10 px back: past the 4 px of tolerance.
      [166, 58, 24],
    ]);
    expect(decisions).toEqual(['stay', 'stay', 'stay', 'switch']);
  });

  test('a jitter back within the tolerance stays', () => {
    const { decisions } = run([
      [150, 40, 0],
      [170, 54, 8],
      [168, 55, 12],
      [180, 58, 20],
    ]);
    expect(decisions).toEqual(['stay', 'stay', 'stay', 'stay']);
  });

  test('a lost aim stays lost until the pointer is back on the trigger row', () => {
    const aim = createSubmenuAim();
    const at = (x: number, y: number, t: number) =>
      aim.move({ x, y }, t, trigger, right);
    at(150, 40, 0);
    expect(at(150, 80, 40)).toBe('switch');
    // Even a fast move at the submenu from there.
    expect(at(190, 60, 48)).toBe('switch');
    expect(aim.check(400)).toBe('switch');
    expect(at(180, 40, 60)).toBe('stay');
    expect(at(195, 56, 66)).toBe('stay');
  });

  test('in the submenu it stays; leaving it for another row switches', () => {
    const { decisions } = run([
      [150, 40, 0],
      [190, 50, 8],
      [210, 60, 16],
      // Back out over the parent's fourth row.
      [190, 90, 40],
    ]);
    expect(decisions).toEqual(['stay', 'stay', 'stay', 'switch']);
  });

  test('without a point on the trigger row (opened from the keyboard), any row switches', () => {
    const { decisions } = run([[150, 64, 0]]);
    expect(decisions).toEqual(['switch']);
  });

  test('opened while the pointer rested on the row, the path starts there', () => {
    const aim = createSubmenuAim();
    // Rested on the row for the 150 ms of the open delay.
    aim.reset({ x: 150, y: 40 }, 0);
    expect(aim.move({ x: 175, y: 55 }, 160, trigger, right)).toBe('stay');
    expect(aim.move({ x: 195, y: 60 }, 168, trigger, right)).toBe('stay');
  });

  describe('flipped to the left', () => {
    test('a fast move left at the submenu stays', () => {
      const { decisions } = run(
        [
          [350, 40, 0],
          [335, 46, 8],
          [318, 54, 16],
          [302, 60, 24],
          [290, 64, 32],
        ],
        flippedTrigger,
        left,
      );
      expect(decisions).toEqual(['stay', 'stay', 'stay', 'stay', 'stay']);
    });

    test('a move right, away from it, switches', () => {
      const { decisions } = run(
        [
          [350, 40, 0],
          [356, 58, 30],
        ],
        flippedTrigger,
        left,
      );
      expect(decisions).toEqual(['stay', 'switch']);
    });

    test('a slow diagonal move down switches', () => {
      const { decisions } = run(
        [
          [350, 40, 0],
          [348, 56, 40],
          [346, 72, 80],
        ],
        flippedTrigger,
        left,
      );
      expect(decisions).toEqual(['stay', 'stay', 'switch']);
    });
  });

  test('the triangle runs from behind the apex to the near edge, widened by the tolerance', () => {
    const apex: AimPoint = { x: 150, y: 40 };
    expect(aimTriangle(apex, trigger, right, 4)).toEqual([
      { x: 146, y: 40 },
      { x: 200, y: 20 },
      { x: 200, y: 228 },
    ]);
    expect(aimTriangle({ x: 350, y: 40 }, flippedTrigger, left, 4)).toEqual([
      { x: 354, y: 40 },
      { x: 300, y: 20 },
      { x: 300, y: 228 },
    ]);
    expect(submenuSide(trigger, right)).toBe('right');
    expect(submenuSide(flippedTrigger, left)).toBe('left');
    const [a, b, c] = aimTriangle(apex, trigger, right, 4);
    expect(inTriangle(a, b, c, { x: 190, y: 100 })).toBe(true);
    expect(inTriangle(a, b, c, { x: 160, y: 100 })).toBe(false);
  });

  test('thresholds are options', () => {
    // A longer rest delay keeps the creep that switched above.
    const steps: Step[] = [[150, 40, 0]];
    for (let i = 1; i <= 8; i++) steps.push([150 + i, 52 + i, i * 20]);
    expect(
      run(steps, trigger, right, { restDelay: 300 }).decisions,
    ).not.toContain('switch');
    // No tolerance: any step back switches.
    expect(
      run(
        [
          [150, 40, 0],
          [170, 54, 8],
          [168, 55, 12],
        ],
        trigger,
        right,
        { tolerance: 0 },
      ).decisions,
    ).toEqual(['stay', 'stay', 'switch']);
  });
});

/**
 * Where the pointer is going while a submenu is open: to the submenu, across
 * the other rows of its parent on the way, or to one of those rows. Pure, and
 * in the view's logical pixels, so it is tested with a stream of points and
 * two rectangles, without rendering.
 *
 * The aim is the triangle from the last point on the trigger row to the near
 * edge of the submenu (the left edge of one on the right, the right edge of
 * one flipped to the left), widened by `tolerance`. The pointer keeps the
 * submenu open while it moves inside that triangle, does not fall back from
 * the submenu by more than `tolerance`, and keeps making progress towards it:
 * at `minSpeed` or faster, at least once every `restDelay`. Stopping, or
 * creeping, for `restDelay` is resting, and switches like leaving the
 * triangle does. Once the aim is lost it stays lost until the pointer is back
 * on the trigger row or in the submenu.
 */
import type { Box } from '../popup/placement';

export interface AimPoint {
  x: number;
  y: number;
}

export type AimDecision = 'stay' | 'switch';

export interface SubmenuAimOptions {
  /**
   * Pixels of slack: around the submenu's near edge, behind the apex, and
   * back from the furthest point reached.
   */
  tolerance: number;
  /** Milliseconds without progress towards the submenu that count as resting. */
  restDelay: number;
  /** Pixels per millisecond towards the submenu that count as progress. */
  minSpeed: number;
}

export const defaultAimOptions: SubmenuAimOptions = {
  tolerance: 4,
  restDelay: 100,
  minSpeed: 0.1,
};

export interface SubmenuAim {
  /** A pointer position at `time` (ms), with the trigger row's and the submenu's boxes. */
  move(point: AimPoint, time: number, trigger: Box, submenu: Box): AimDecision;
  /** Whether the aim still holds at `time` with no move since: for a rest timer. */
  check(time: number): AimDecision;
  /** When `check` would first switch, if the pointer stays where it is; null when it would not. */
  deadline(): number | null;
  /** The last decision. */
  decision(): AimDecision;
  /**
   * Forgets the path: a submenu opened or closed. `from` is where the
   * pointer last was, at `time`: on the trigger row, it is where the path
   * starts.
   */
  reset(from?: AimPoint, time?: number): void;
}

const inside = (box: Box, p: AimPoint, slack = 0) =>
  p.x >= box.x - slack &&
  p.x <= box.x + box.width + slack &&
  p.y >= box.y - slack &&
  p.y <= box.y + box.height + slack;

/** Which side of the trigger the submenu is on, from where it was placed. */
export function submenuSide(trigger: Box, submenu: Box): 'left' | 'right' {
  return submenu.x + submenu.width / 2 >= trigger.x + trigger.width / 2
    ? 'right'
    : 'left';
}

const cross = (a: AimPoint, b: AimPoint, p: AimPoint) =>
  (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

/** Inside triangle abc, or on its edge. */
export function inTriangle(a: AimPoint, b: AimPoint, c: AimPoint, p: AimPoint) {
  const d1 = cross(a, b, p);
  const d2 = cross(b, c, p);
  const d3 = cross(c, a, p);
  const negative = d1 < 0 || d2 < 0 || d3 < 0;
  const positive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(negative && positive);
}

/**
 * The aim triangle: the apex moved back by `tolerance`, away from the
 * submenu, and the submenu's near edge, longer by `tolerance` at each end.
 */
export function aimTriangle(
  apex: AimPoint,
  trigger: Box,
  submenu: Box,
  tolerance: number,
): [AimPoint, AimPoint, AimPoint] {
  const right = submenuSide(trigger, submenu) === 'right';
  const edge = right ? submenu.x : submenu.x + submenu.width;
  return [
    { x: apex.x + (right ? -tolerance : tolerance), y: apex.y },
    { x: edge, y: submenu.y - tolerance },
    { x: edge, y: submenu.y + submenu.height + tolerance },
  ];
}

export function createSubmenuAim(
  options: Partial<SubmenuAimOptions> = {},
): SubmenuAim {
  const { tolerance, restDelay, minSpeed } = {
    ...defaultAimOptions,
    ...options,
  };
  // The last point on the trigger row, while the pointer is between it and
  // the submenu; null before it was on the row, and once it reached the
  // submenu.
  let apex: AimPoint | null = null;
  let last: { point: AimPoint; time: number } | null = null;
  // Towards the submenu: x on the right, -x on the left.
  let direction = 1;
  let furthest = -Infinity;
  let progressAt = 0;
  let speed = 0;
  // Between the row and the submenu, where resting can switch.
  let between = false;
  let lost = false;
  let decided: AimDecision = 'stay';

  const lose = (): AimDecision => {
    lost = true;
    between = false;
    return (decided = 'switch');
  };

  return {
    move(point, time, trigger, submenu) {
      const previous = last;
      last = { point, time };
      if (inside(submenu, point)) {
        // Arrived: the path is done. Moving back out is a new one.
        apex = null;
        lost = false;
        between = false;
        return (decided = 'stay');
      }
      direction = submenuSide(trigger, submenu) === 'right' ? 1 : -1;
      const toward = point.x * direction;
      // Opened while the pointer rested on the row: the path starts there.
      if (!apex && !lost && previous && inside(trigger, previous.point)) {
        apex = previous.point;
        furthest = previous.point.x * direction;
        progressAt = time;
        speed = 0;
      }
      if (inside(trigger, point)) {
        apex = point;
        lost = false;
        between = false;
        furthest = toward;
        progressAt = time;
        speed = 0;
        return (decided = 'stay');
      }
      // Never on the row since it opened (the keyboard opened it), or
      // already off course: the row under the pointer is the one it wants.
      if (!apex || lost) return lose();
      between = true;
      if (previous) {
        const elapsed = Math.max(1, time - previous.time);
        const step = (toward - previous.point.x * direction) / elapsed;
        // Smoothed, so one slow sample of a fast move does not end it.
        speed = speed === 0 ? step : (speed + step) / 2;
      }
      if (toward < furthest - tolerance) return lose();
      furthest = Math.max(furthest, toward);
      const [a, b, c] = aimTriangle(apex, trigger, submenu, tolerance);
      if (!inTriangle(a, b, c, point)) return lose();
      if (speed >= minSpeed) progressAt = time;
      if (time - progressAt >= restDelay) return lose();
      return (decided = 'stay');
    },
    check(time) {
      if (lost) return 'switch';
      if (between && time - progressAt >= restDelay) return lose();
      return decided;
    },
    deadline() {
      return between && !lost ? progressAt + restDelay : null;
    },
    decision() {
      return decided;
    },
    reset(from, time = 0) {
      apex = null;
      last = from ? { point: from, time } : null;
      furthest = -Infinity;
      progressAt = 0;
      speed = 0;
      between = false;
      lost = false;
      decided = 'stay';
    },
  };
}

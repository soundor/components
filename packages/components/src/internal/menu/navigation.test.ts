import { describe, expect, test } from 'vitest';

import {
  firstEnabled,
  jumpEnabled,
  lastEnabled,
  matchLabel,
  stepEnabled,
} from './navigation';

// Separators and disabled entries are both "not enabled".
const enabled = [false, true, false, true, true, false];

describe('list navigation', () => {
  test('steps over what is disabled and wraps at the ends', () => {
    expect(firstEnabled(enabled)).toBe(1);
    expect(lastEnabled(enabled)).toBe(4);
    expect(stepEnabled(enabled, 1, 1)).toBe(3);
    expect(stepEnabled(enabled, 4, 1)).toBe(1);
    expect(stepEnabled(enabled, 1, -1)).toBe(4);
    // From nothing: the first or last.
    expect(stepEnabled(enabled, -1, 1)).toBe(1);
    expect(stepEnabled(enabled, -1, -1)).toBe(4);
    expect(stepEnabled(enabled, 4, 1, false)).toBe(4);
    expect(stepEnabled([false, false], -1, 1)).toBe(-1);
    expect(stepEnabled([], -1, 1)).toBe(-1);
  });

  test('pages stop at the last enabled entry', () => {
    expect(jumpEnabled(enabled, 1, 1, 8)).toBe(4);
    expect(jumpEnabled(enabled, 4, -1, 1)).toBe(3);
    expect(jumpEnabled(enabled, -1, 1, 2)).toBe(3);
  });

  test('typing finds a label, refines it, and cycles a repeated letter', () => {
    const labels = ['Saw', 'Sine', 'Square', 'Triangle', 'Super Saw'];
    const all = labels.map(() => true);
    expect(matchLabel(labels, all, 's', -1)).toBe(0);
    expect(matchLabel(labels, all, 'si', 0)).toBe(1);
    expect(matchLabel(labels, all, 'ss', 0)).toBe(1);
    expect(matchLabel(labels, all, 'sss', 1)).toBe(2);
    expect(matchLabel(labels, all, 'su', 2)).toBe(4);
    expect(matchLabel(labels, all, 'T', 4)).toBe(3);
    expect(matchLabel(labels, all, 'x', 0)).toBe(-1);
    expect(matchLabel(labels, [true, false, true, true, true], 'si', 0)).toBe(
      -1,
    );
  });
});

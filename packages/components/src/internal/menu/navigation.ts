/**
 * Moving through a list of entries some of which can't be chosen: menu items,
 * a Select's options. Pure; an index of -1 is "none".
 */

/** The next enabled entry from `from` in `direction`, wrapping at the ends, or -1. */
export function stepEnabled(
  enabled: readonly boolean[],
  from: number,
  direction: 1 | -1,
  wrap = true,
): number {
  const count = enabled.length;
  if (count === 0) return -1;
  let at = from < 0 ? (direction > 0 ? -1 : count) : from;
  for (let i = 0; i < count; i++) {
    at += direction;
    if (at < 0 || at >= count) {
      if (!wrap) return from >= 0 && enabled[from] ? from : -1;
      at = (at + count) % count;
    }
    if (enabled[at]) return at;
  }
  return -1;
}

export const firstEnabled = (enabled: readonly boolean[]) =>
  stepEnabled(enabled, -1, 1);

export const lastEnabled = (enabled: readonly boolean[]) =>
  stepEnabled(enabled, -1, -1);

/**
 * `count` enabled entries on in `direction` (Page Up and Page Down), stopping
 * at the last enabled one rather than wrapping.
 */
export function jumpEnabled(
  enabled: readonly boolean[],
  from: number,
  direction: 1 | -1,
  count: number,
): number {
  let at = from;
  for (let i = 0; i < count; i++) {
    const next = stepEnabled(enabled, at, direction, false);
    if (next === at || next < 0) break;
    at = next;
  }
  return at < 0 ? (direction > 0 ? firstEnabled(enabled) : -1) : at;
}

/**
 * The first enabled entry after `from` whose label starts with `query`, case
 * aside, wrapping; a repeated letter ("ss") cycles through the entries that
 * start with it. -1 when none does.
 */
export function matchLabel(
  labels: readonly string[],
  enabled: readonly boolean[],
  query: string,
  from: number,
): number {
  const text = query.toLocaleLowerCase();
  if (!text) return -1;
  const repeated = [...text].every((char) => char === text[0]);
  const search = repeated ? text[0]! : text;
  const count = labels.length;
  // A longer query refines the current match; a new letter moves on.
  const start = repeated || from < 0 ? from + 1 : from;
  for (let i = 0; i < count; i++) {
    const at = (((start + i) % count) + count) % count;
    if (enabled[at] && labels[at]!.toLocaleLowerCase().startsWith(search))
      return at;
  }
  return -1;
}

import { environment } from 'soundor:host';

import type { Coordinates, Point } from '../../chart/geometry';
import { beginEdits } from '../../internal/gesture';
import type { GuideLayer } from './controller';

export interface PlotGroupDrag {
  ids: readonly string[];
  markerId: string;
  phase: 'start' | 'move' | 'end' | 'cancel';
  /** Displacement from the original marker position in logical pixels. */
  delta: Point;
  coordinates: Coordinates;
}

export interface PlotSelection {
  selectedIds: readonly string[];
  onSelectionChange: (ids: readonly string[]) => void;
  multiple?: boolean;
  clearOnBackgroundPress?: boolean;
  /** Drag empty space to select a rectangle when multiple selection is enabled. */
  rectangle?: boolean;
  /** Override grouped movement instead of calling each marker's move handlers. */
  onGroupDrag?: (event: PlotGroupDrag) => void;
}

export interface GroupMarkerEdit {
  coordinates: Coordinates;
  movement: 'x' | 'y' | 'both';
  point: Point;
  move: (point: Point) => void;
  constrain?: (point: Point) => Point;
  start?: () => void;
  cancel?: () => void;
  end?: () => void;
}

/** Snapshot movable members; intersect their pixel travel so the group stops
 * at its first axis boundary instead of bunching up against the edge. */
export function moveSelectedGuides(
  guides: readonly GuideLayer[],
  anchor: GuideLayer,
  ids: readonly string[],
) {
  const selected = new Set(ids);
  const members = guides.flatMap((guide) => {
    const edit = guide.edit;
    if (
      !edit ||
      guide.marker.disabled ||
      guide.id === undefined ||
      !selected.has(guide.id)
    )
      return [];
    const { x, y } = edit.coordinates;
    return [{ guide, edit, x: x.map(edit.point[0]), y: y.map(edit.point[1]) }];
  });
  const clampDelta = (name: 'x' | 'y', delta: number) => {
    let min = -Infinity;
    let max = Infinity;
    for (const member of members) {
      if (member.edit.movement === (name === 'x' ? 'y' : 'x')) continue;
      const { inner } = member.edit.coordinates;
      const edge = name === 'x' ? inner.left : inner.top;
      const length = name === 'x' ? inner.width : inner.height;
      min = Math.max(min, edge - member[name]);
      max = Math.min(max, edge + length - member[name]);
    }
    return Math.max(min, Math.min(max, delta));
  };
  let finish: ((cancel: boolean) => void) | undefined;
  return ({ phase, delta }: PlotGroupDrag) => {
    if (phase === 'start') {
      finish = beginEdits(
        ...members.map(({ guide, edit }) => () => {
          if (guide !== anchor) edit.start?.();
          return (cancel: boolean) => {
            try {
              if (cancel) {
                if (guide.edit) edit.move(edit.point);
                if (guide !== anchor) edit.cancel?.();
              }
            } finally {
              if (guide !== anchor) edit.end?.();
            }
          };
        }),
      );
      return;
    }
    if (phase !== 'move') {
      finish?.(phase === 'cancel');
      return;
    }
    const dx = clampDelta('x', delta[0]);
    const dy = clampDelta('y', delta[1]);
    for (const member of members) {
      const { guide, edit } = member;
      if (!guide.edit) continue;
      const point: Point = [
        edit.movement === 'y'
          ? edit.point[0]
          : edit.coordinates.x.invert(member.x + dx),
        edit.movement === 'x'
          ? edit.point[1]
          : edit.coordinates.y.invert(member.y + dy),
      ];
      edit.move(
        guide !== anchor && edit.constrain ? edit.constrain(point) : point,
      );
    }
  };
}

export type SelectionOperation = 'replace' | 'add' | 'toggle';

export function selectionOperation(event: {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): SelectionOperation {
  const apple =
    environment.platform === 'macos' || environment.platform === 'ios';
  return (apple ? event.metaKey : event.ctrlKey)
    ? 'toggle'
    : event.shiftKey
      ? 'add'
      : 'replace';
}

export function combineSelection(
  initial: readonly string[],
  enclosed: readonly string[],
  operation: SelectionOperation,
): readonly string[] {
  if (operation === 'replace') return enclosed;
  if (operation === 'add') return [...new Set([...initial, ...enclosed])];
  const before = new Set(initial);
  const inside = new Set(enclosed);
  return [
    ...initial.filter((id) => !inside.has(id)),
    ...enclosed.filter((id) => !before.has(id)),
  ];
}

export function sameSelection(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

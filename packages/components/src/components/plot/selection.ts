import type { Coordinates, Point } from '../../chart/geometry';

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
  /** Shift-drag on the background selects markers in the rectangle. */
  rectangle?: boolean;
  onGroupDrag?: (event: PlotGroupDrag) => void;
}

export function selectPlotItem(
  selection: PlotSelection,
  id: string,
  toggle: boolean,
) {
  const { selectedIds, multiple, onSelectionChange } = selection;
  if (toggle && multiple) {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  } else if (
    !(multiple && selectedIds.includes(id)) &&
    (selectedIds.length !== 1 || selectedIds[0] !== id)
  ) {
    onSelectionChange([id]);
  }
}

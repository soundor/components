import { useRef, useState } from 'react';
import type {
  AccessibilityActionEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
} from 'soundor:ui';

import { firstEnabled, lastEnabled, stepEnabled } from './menu/navigation';
import { selectionModifier } from './shortcut';

export interface SelectionItem<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
}

export type SelectionMode = 'single' | 'toggle' | 'extended';

export interface SelectionOptions<T extends string> {
  items: readonly SelectionItem<T>[];
  selectedIds: readonly T[];
  onSelectionChange: (ids: readonly T[]) => void;
  /** Use toggle mode when `selectionMode` is omitted. */
  multiple?: boolean;
  /** Overrides `multiple`. Defaults to `toggle` with `multiple`, otherwise `single`. */
  selectionMode?: SelectionMode;
  orientation?: 'horizontal' | 'vertical';
}

export function useSelection<T extends string>({
  items,
  selectedIds,
  onSelectionChange,
  multiple,
  selectionMode = multiple ? 'toggle' : 'single',
  orientation = 'vertical',
}: SelectionOptions<T>) {
  const nodes = useRef(new Map<T, UiNode>());
  const anchorId = useRef<T | undefined>(undefined);
  const [lastFocusedId, setLastFocusedId] = useState<T>();
  const firstSelected = items.find(
    (item) => !item.disabled && selectedIds.includes(item.id),
  );
  const tabStopId =
    items.find((item) => !item.disabled && item.id === lastFocusedId)?.id ??
    firstSelected?.id ??
    items.find((item) => !item.disabled)?.id;

  function updateSelection(ids: readonly T[]) {
    if (
      ids.length !== selectedIds.length ||
      ids.some((id, index) => id !== selectedIds[index])
    ) {
      onSelectionChange(ids);
    }
  }

  function selectItem(id: T, toggle: boolean) {
    anchorId.current = id;
    updateSelection(
      !toggle
        ? [id]
        : selectedIds.includes(id)
          ? selectedIds.filter((selected) => selected !== id)
          : [...selectedIds, id],
    );
  }

  function selectRange(id: T, fallback: T, additive = false) {
    let anchor = items.findIndex(
      (item) => !item.disabled && item.id === anchorId.current,
    );
    if (anchor === -1) {
      anchor = items.findIndex(
        (item) => !item.disabled && item.id === fallback,
      );
      if (anchor === -1) return;
      anchorId.current = fallback;
    }
    const end = items.findIndex((item) => item.id === id);
    const range = items
      .slice(Math.min(anchor, end), Math.max(anchor, end) + 1)
      .filter((item) => !item.disabled)
      .map((item) => item.id);
    updateSelection(
      additive ? [...new Set([...selectedIds, ...range])] : range,
    );
  }

  return {
    attach(id: T, node: UiNode | null) {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    tabStop(id: T) {
      return id === tabStopId;
    },
    onFocus(id: T) {
      setLastFocusedId(id);
    },
    select(
      item: SelectionItem<T>,
      event?: PointerEvent | KeyboardEvent | AccessibilityActionEvent,
    ) {
      if (item.disabled) return;
      if (selectionMode === 'extended' && event && 'shiftKey' in event) {
        const modified = selectionModifier(event);
        const space = 'key' in event && event.key === ' ';
        if (event.shiftKey && event.type === 'click') {
          selectRange(item.id, firstSelected?.id ?? item.id, modified);
        } else {
          selectItem(item.id, space || modified);
        }
      } else {
        selectItem(item.id, selectionMode === 'toggle');
      }
    },
    onKeyDown(id: T, event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey) return;
      const extended = selectionMode === 'extended';
      const modified = selectionModifier(event);
      if (
        extended &&
        modified &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'a'
      ) {
        event.preventDefault();
        updateSelection(
          items.filter((item) => !item.disabled).map((item) => item.id),
        );
        return;
      }
      if (
        (!extended && event.ctrlKey) ||
        (event.metaKey && (!extended || !modified))
      )
        return;
      const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const previous = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      if (![next, previous, 'Home', 'End'].includes(event.key)) return;
      const enabled = items.map((item) => !item.disabled);
      const at =
        event.key === 'Home'
          ? firstEnabled(enabled)
          : event.key === 'End'
            ? lastEnabled(enabled)
            : stepEnabled(
                enabled,
                items.findIndex((item) => item.id === id),
                event.key === next ? 1 : -1,
              );
      const item = items[at];
      if (!item) return;
      event.preventDefault();
      const node = nodes.current.get(item.id);
      node?.focus();
      node?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (extended) {
        if (event.shiftKey) selectRange(item.id, id);
        else if (!event.ctrlKey && !modified) selectItem(item.id, false);
      }
    },
  };
}

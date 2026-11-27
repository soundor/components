import { useRef, useState } from 'react';
import type { KeyboardEvent, UiNode } from 'soundor:ui';

import { firstEnabled, lastEnabled, stepEnabled } from './menu/navigation';

export interface SelectionItem<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
}

export interface SelectionOptions<T extends string> {
  items: readonly SelectionItem<T>[];
  selectedIds: readonly T[];
  onSelectionChange: (ids: readonly T[]) => void;
  multiple?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function useSelection<T extends string>({
  items,
  selectedIds,
  onSelectionChange,
  multiple,
  orientation = 'vertical',
}: SelectionOptions<T>) {
  const nodes = useRef(new Map<T, UiNode>());
  const [lastFocusedId, setLastFocusedId] = useState<T>();
  const tabStopId =
    items.find((item) => !item.disabled && item.id === lastFocusedId)?.id ??
    items.find((item) => !item.disabled && selectedIds.includes(item.id))?.id ??
    items.find((item) => !item.disabled)?.id;

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
    select(item: SelectionItem<T>) {
      if (item.disabled) return;
      const selected = selectedIds.includes(item.id);
      if (multiple)
        onSelectionChange(
          selected
            ? selectedIds.filter((id) => id !== item.id)
            : [...selectedIds, item.id],
        );
      else if (!selected || selectedIds.length !== 1)
        onSelectionChange([item.id]);
    },
    onKeyDown(id: T, event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
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
    },
  };
}

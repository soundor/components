/**
 * How a ContextMenu is asked to open: the engine's semantic `contextmenu`
 * (a secondary press, Control-click, Shift+F10, the context menu key, a long
 * touch, and the platform's own "show menu" accessibility action, dispatched
 * as one cancellable event) on the child's node, and the engine's
 * `showContextMenu` accessibility action offered after the child's own.
 *
 * The listener is on the node, not an `onContextMenu` prop on the child: the
 * controls of this library forward only `ref` and the accessibility props,
 * and the event bubbles to the node from whatever inside it was asked.
 * Nothing outside this file knows how a menu is invoked: ContextMenu.Trigger
 * only calls the hook and spreads what it returns on its child.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Ref } from 'react';
import type { AccessibilityAction, PointerEvent, UiNode } from 'soundor:ui';

import { useMergedRef, type HostProps } from '../host';

/** The accessibility action a ContextMenu adds to what it is for. */
export const showContextMenuAction = { name: 'showContextMenu' } as const;

/** Where the menu was asked for, and where focus goes when it opens. */
export interface ContextMenuRequest {
  /** Where the press was, or the control the keyboard or a screen reader was on. */
  at: { x: number; y: number } | UiNode;
  /** From the pointer, the menu itself; from the keyboard, its first item. */
  focus: 'list' | 'first';
}

export interface ContextMenuTriggerOptions {
  /** Asks for no menu, and offers no "Show menu". */
  disabled: boolean;
  onOpen: (request: ContextMenuRequest) => void;
}

/**
 * The props to give a ContextMenu's child, from its own: its ref, kept
 * working, and its accessibility actions with `showContextMenu` after them.
 * An inner ContextMenu that took the event leaves nothing for an outer one.
 */
export function useContextMenuTrigger(
  child: HostProps,
  { disabled, onOpen }: ContextMenuTriggerOptions,
): {
  ref: Ref<UiNode> | undefined;
  accessibilityActions: readonly AccessibilityAction[] | undefined;
} {
  // The child's node, from its own ref, and the child's ref kept working.
  const [node, setNode] = useState<UiNode | null>(null);
  const attach = useCallback((value: UiNode | null) => setNode(value), []);
  const ref = useMergedRef<UiNode>(attach, child.ref);

  const latest = useRef({ disabled, onOpen });
  useLayoutEffect(() => {
    latest.current = { disabled, onOpen };
  });
  useEffect(() => {
    if (!node) return undefined;
    const onContextMenu = (event: PointerEvent) => {
      const { disabled, onOpen } = latest.current;
      if (disabled || event.defaultPrevented) return;
      // Taken here: the browser's own menu, and a ContextMenu around this
      // one, stay away.
      event.preventDefault();
      // A pointer has a position. The keyboard and assistive technology do
      // not (their `pointerType` is empty): beside what was asked instead,
      // the control or one in a group, with the first item focused.
      if (event.pointerType === '')
        onOpen({ at: event.target ?? node, focus: 'first' });
      else onOpen({ at: { x: event.pageX, y: event.pageY }, focus: 'list' });
    };
    node.addEventListener('contextmenu', onContextMenu);
    return () => node.removeEventListener('contextmenu', onContextMenu);
  }, [node]);

  // After the control's own actions; the engine's default of the action is
  // the `contextmenu` above.
  const accessibilityActions = disabled
    ? child.accessibilityActions
    : [
        ...(child.accessibilityActions ?? []).filter(
          (action) => action.name !== showContextMenuAction.name,
        ),
        showContextMenuAction,
      ];
  return { ref, accessibilityActions };
}

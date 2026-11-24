/**
 * How a ContextMenu is asked to open, until the engine says so itself.
 *
 * TEMPORARY. Soundor's engine is gaining a semantic `contextmenu` (secondary
 * press, Control-click, Shift+F10, the context menu key, a long touch, and
 * the platform's own accessibility "show menu", dispatched as one cancellable
 * event: soundor/soundor#399). Until a release has it, this hook recognises
 * those inputs from the events there are now. When it does, all of this
 * becomes the equivalent of:
 *
 *   cloneElement(child, {
 *     ref,
 *     accessibilityActions: [...own, { name: 'showContextMenu' }],
 *     onContextMenu: compose(child.props.onContextMenu, open),
 *   });
 *
 * and the listeners, the timer and the custom action below go. Nothing
 * outside this file knows how a menu is invoked: ContextMenu.Trigger only
 * calls the hook and spreads what it returns on its child.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from 'react';
import type {
  AccessibilityAction,
  AccessibilityActionEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
} from 'soundor:ui';

import { useMergedRef, type HostProps } from '../host';

/** The custom accessibility action a ContextMenu adds to what it is for. */
export const showMenuAction = { name: 'showMenu', label: 'Show menu' } as const;

/** How long a touch held still opens the menu, in milliseconds. */
export const longPressDelay = 500;

/** How far a touch may move and still be a long press, in view pixels. */
const slop = 8;

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
 * working, and its accessibility actions with "Show menu" after them. The
 * listeners are on the child's node, after its own handlers (they bubble to
 * it): what the control used, such as a drag's keys, stays its own, and an
 * inner ContextMenu that took the event leaves nothing for an outer one.
 */
export function useContextMenuTrigger(
  child: HostProps,
  { disabled, onOpen }: ContextMenuTriggerOptions,
): {
  ref: Ref<UiNode> | undefined;
  accessibilityActions: readonly AccessibilityAction[] | undefined;
  onAccessibilityAction:
    | ((event: AccessibilityActionEvent) => void)
    | undefined;
} {
  // The child's node, from its own ref, and the child's ref kept working.
  const [node, setNode] = useState<UiNode | null>(null);
  const attach = useCallback((value: UiNode | null) => setNode(value), []);
  const ref = useMergedRef<UiNode>(attach, child.ref);

  const handlers = useRef({ disabled, onOpen });
  useLayoutEffect(() => {
    handlers.current = { disabled, onOpen };
  });
  useEffect(() => {
    if (!node) return undefined;
    let press: {
      id: number;
      x: number;
      y: number;
      timer: ReturnType<typeof setTimeout>;
      opened: boolean;
    } | null = null;
    const cancel = () => {
      if (press) clearTimeout(press.timer);
      press = null;
    };
    const onContextMenu = (event: PointerEvent) => {
      const { disabled, onOpen } = handlers.current;
      if (disabled || event.defaultPrevented) return;
      // A long touch the timer has opened, or will: one menu, not two.
      if (event.pointerType === 'touch' && press) {
        event.preventDefault();
        return;
      }
      // A drag with the primary button down: not now.
      if (event.buttons & 1) return;
      // Taken here: the browser's own menu, and a ContextMenu around this
      // one, stay away.
      event.preventDefault();
      onOpen({ at: { x: event.pageX, y: event.pageY }, focus: 'list' });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const { disabled, onOpen } = handlers.current;
      if (disabled || event.defaultPrevented) return;
      const invoked =
        event.key === 'ContextMenu' ||
        (event.key === 'F10' &&
          event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey);
      if (!invoked) return;
      event.preventDefault();
      // Beside what has focus: the control, or one in a group.
      onOpen({ at: event.target ?? node, focus: 'first' });
    };
    const onPointerDown = (event: PointerEvent) => {
      const { disabled, onOpen } = handlers.current;
      cancel();
      if (disabled || event.pointerType !== 'touch' || !event.isPrimary) return;
      const at = { x: event.pageX, y: event.pageY };
      press = {
        id: event.pointerId,
        ...at,
        opened: false,
        timer: setTimeout(() => {
          if (!press) return;
          press.opened = true;
          // Focus moves to the menu: a gesture the control began on the
          // press ends with the control's focus.
          onOpen({ at, focus: 'list' });
        }, longPressDelay),
      };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!press || press.opened || event.pointerId !== press.id) return;
      // Moved: a drag, which the control keeps.
      if (Math.hypot(event.pageX - press.x, event.pageY - press.y) > slop)
        cancel();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (press && event.pointerId === press.id) cancel();
    };
    // A screen reader's "Show menu": it bubbles here from the control, which
    // leaves an action it does not know.
    const onAction = (event: AccessibilityActionEvent) => {
      const { disabled, onOpen } = handlers.current;
      if (
        disabled ||
        event.defaultPrevented ||
        event.actionName !== showMenuAction.name
      )
        return;
      event.preventDefault();
      onOpen({ at: event.target ?? node, focus: 'first' });
    };
    node.addEventListener('contextmenu', onContextMenu);
    node.addEventListener('keydown', onKeyDown);
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerEnd);
    node.addEventListener('pointercancel', onPointerEnd);
    node.addEventListener('accessibilityaction', onAction);
    return () => {
      cancel();
      node.removeEventListener('contextmenu', onContextMenu);
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerEnd);
      node.removeEventListener('pointercancel', onPointerEnd);
      node.removeEventListener('accessibilityaction', onAction);
    };
  }, [node]);

  // "Show menu" for a screen reader, after the control's own actions; the
  // listener above runs it.
  const accessibilityActions = disabled
    ? child.accessibilityActions
    : [
        ...(child.accessibilityActions ?? []).filter(
          (action) => action.name !== showMenuAction.name,
        ),
        showMenuAction,
      ];
  const own = child.onAccessibilityAction;
  // Show menu is the ContextMenu's: the child's handler hears the rest.
  const onAccessibilityAction =
    own &&
    ((event: AccessibilityActionEvent) => {
      if (!disabled && event.actionName === showMenuAction.name) return;
      own(event);
    });
  return { ref, accessibilityActions, onAccessibilityAction };
}

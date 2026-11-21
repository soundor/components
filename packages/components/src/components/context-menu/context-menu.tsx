import {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type {
  AccessibilityActionEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
} from 'soundor:ui';

import { useMergedRef, type HostProps } from '../../internal/host';
import type { ControlSize, StyleProps } from '../../theme';
import type { MenuListProps } from '../menu/menu-list';
import { MenuPopup } from '../menu/menu-popup';
import type { MenuItem } from '../menu/types';

/** The custom accessibility action a ContextMenu adds to what it is for. */
export const showMenuAction = { name: 'showMenu', label: 'Show menu' } as const;

export interface ContextMenuProps extends StyleProps<'Menu'> {
  /**
   * The menu's items, or a function that makes them each time it opens, so
   * they show the state at that moment (a parameter at its default has
   * nothing to reset).
   */
  items: readonly MenuItem[] | (() => readonly MenuItem[]);
  /**
   * What the menu is for: one element that takes `ref` and
   * `accessibilityActions`, such as a Knob or any control of this library,
   * or a View around a group of them. It is not wrapped: it lays out as it
   * would on its own.
   */
  children: ReactElement<HostProps>;
  /** Opens no menu. */
  disabled?: boolean;
  size?: ControlSize;
  /** What assistive technology calls the menu. */
  accessibilityLabel?: string;
  /** Opened, or closed. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Touch: how long a press that does not move opens the menu, in
   * milliseconds; 500 by default, 0 for never.
   */
  longPressDelay?: number;
  debugId?: string;
}

interface Opening {
  items: readonly MenuItem[];
  /** Where the press was, or the control the keyboard or a screen reader was on. */
  at: { x: number; y: number } | UiNode;
  focus: MenuListProps['initialFocus'];
}

/** The child, given the ContextMenu's ref and actions in place of its own. */
function withHost(element: ReactElement<HostProps>, host: HostProps) {
  return cloneElement(element, host);
}

/** How far a touch may move and still be a long press, in view pixels. */
const slop = 8;

/**
 * A menu of actions for a control: opened by the platform's secondary press
 * (a right-click, a Control-click) or a long touch at the pointer; from the
 * keyboard with Shift+F10 or the context menu key, and by a screen reader's
 * "Show menu" action, beside the control.
 */
export function ContextMenu({
  items,
  children,
  disabled = false,
  size = 'md',
  accessibilityLabel,
  onOpenChange,
  longPressDelay = 500,
  debugId,
  ...styles
}: ContextMenuProps) {
  const [opening, setOpening] = useState<Opening | null>(null);
  const latest = useRef(opening);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      // Unmounted with its menu open: nothing to tell.
      mounted.current = false;
    };
  }, []);

  const open = (next: Omit<Opening, 'items'>) => {
    const list = typeof items === 'function' ? items() : items;
    if (list.length === 0) return;
    const reopened = latest.current !== null;
    latest.current = { ...next, items: list };
    setOpening(latest.current);
    if (!reopened) onOpenChange?.(true);
  };
  const close = () => {
    if (!mounted.current || latest.current === null) return;
    latest.current = null;
    setOpening(null);
    onOpenChange?.(false);
  };

  // The child's node, from its own ref, and the child's ref kept working.
  const [node, setNode] = useState<UiNode | null>(null);
  const attach = useCallback((value: UiNode | null) => setNode(value), []);
  const child = children.props;
  const childRef = useMergedRef<UiNode>(attach, child.ref);

  // Listeners on the child's node, after its own handlers (they bubble to
  // it): what the control used, such as a drag's keys, stays its own.
  const handlers = useRef({ disabled, longPressDelay, open });
  useLayoutEffect(() => {
    handlers.current = { disabled, longPressDelay, open };
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
      const { disabled, open } = handlers.current;
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
      open({ at: { x: event.pageX, y: event.pageY }, focus: 'list' });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const { disabled, open } = handlers.current;
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
      open({ at: event.target ?? node, focus: 'first' });
    };
    const onPointerDown = (event: PointerEvent) => {
      const { disabled, longPressDelay, open } = handlers.current;
      cancel();
      if (
        disabled ||
        longPressDelay <= 0 ||
        event.pointerType !== 'touch' ||
        !event.isPrimary
      )
        return;
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
          open({ at, focus: 'list' });
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
      const { disabled, open } = handlers.current;
      if (disabled || event.actionName !== showMenuAction.name) return;
      event.preventDefault();
      open({ at: event.target ?? node, focus: 'first' });
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
  const actions = disabled
    ? child.accessibilityActions
    : [
        ...(child.accessibilityActions ?? []).filter(
          (action) => action.name !== showMenuAction.name,
        ),
        showMenuAction,
      ];
  const control = withHost(children, {
    ref: childRef,
    accessibilityActions: actions,
    // Show menu is the ContextMenu's: the child's handler hears the rest.
    onAccessibilityAction:
      child.onAccessibilityAction &&
      ((event: AccessibilityActionEvent) => {
        if (!disabled && event.actionName === showMenuAction.name) return;
        child.onAccessibilityAction?.(event);
      }),
  });

  const at = opening?.at;
  const anchor = useMemo(
    () =>
      at === undefined ? null : 'addEventListener' in at ? { current: at } : at,
    [at],
  );

  return (
    <>
      {control}
      {opening && anchor && (
        <MenuPopup
          {...styles}
          items={opening.items}
          anchor={anchor}
          side="bottom"
          align="start"
          offset={'current' in anchor ? 4 : 2}
          size={size}
          label={accessibilityLabel}
          initialFocus={opening.focus}
          close={close}
          debugId={debugId}
        />
      )}
    </>
  );
}

import { View, type StyleProp } from '@soundor/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { KeyboardEvent, PointerEvent, UiNode } from 'soundor:ui';

import type { ControlSize, StyleProps } from '../../theme';
import type { MenuListProps } from '../menu/menu-list';
import { MenuPopup } from '../menu/menu-popup';
import type { MenuItem } from '../menu/types';

export interface ContextMenuProps extends StyleProps<'Menu'> {
  /**
   * The menu's items, or a function that makes them each time it opens, so
   * they show the state at that moment (a parameter at its default has
   * nothing to reset).
   */
  items: readonly MenuItem[] | (() => readonly MenuItem[]);
  /** What the menu is for: a Knob, a Plot, a row of controls. */
  children?: ReactNode;
  /** Opens no menu. */
  disabled?: boolean;
  size?: ControlSize;
  /** What assistive technology calls the menu. */
  accessibilityLabel?: string;
  /** Opened, or closed. */
  onOpenChange?: (open: boolean) => void;
  /**
   * The style of the view around `children`, which takes the secondary press
   * and the keys. It lays them out as a column, as any view; give it
   * `flex: 1` where they should grow.
   */
  containerStyle?: StyleProp;
  debugId?: string;
}

interface Opening {
  items: readonly MenuItem[];
  /** Where the pointer was, or the control that had focus. */
  at: { x: number; y: number } | null;
  focus: MenuListProps['initialFocus'];
}

/**
 * A menu of actions for what it wraps, opened by the platform's secondary
 * press (a right-click, a Control-click) at the pointer, or from the keyboard
 * with Shift+F10 or the context menu key beside the focused control.
 */
export function ContextMenu({
  items,
  children,
  disabled = false,
  size = 'md',
  accessibilityLabel,
  onOpenChange,
  containerStyle,
  debugId,
  ...styles
}: ContextMenuProps) {
  const [opening, setOpening] = useState<Opening | null>(null);
  const control = useRef<UiNode | null>(null);
  const latest = useRef(opening);
  useLayoutEffect(() => {
    latest.current = opening;
  });
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

  return (
    <View
      style={containerStyle}
      onContextMenu={(event: PointerEvent) => {
        if (disabled || event.defaultPrevented) return;
        // A drag with the primary button down: not now.
        if (event.buttons & 1) return;
        // Taken here: the browser's own menu, and a ContextMenu around this
        // one, stay away.
        event.preventDefault();
        open({ at: { x: event.pageX, y: event.pageY }, focus: 'list' });
      }}
      onKeyDown={(event: KeyboardEvent) => {
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
        control.current = event.target;
        open({ at: null, focus: 'first' });
      }}
    >
      {children}
      {opening && (
        <MenuPopup
          {...styles}
          items={opening.items}
          anchor={opening.at ?? control}
          side="bottom"
          align="start"
          offset={opening.at ? 2 : 4}
          size={size}
          label={accessibilityLabel}
          initialFocus={opening.focus}
          close={close}
          debugId={debugId}
        />
      )}
    </View>
  );
}

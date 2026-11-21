import type { AccessibilityState } from '@soundor/react';
import { cloneElement, useMemo, useState, type ReactElement } from 'react';
import type {
  AccessibilityActionEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
} from 'soundor:ui';

import {
  useOpenState,
  type OpenStateProps,
} from '../../internal/popup/open-state';
import type { PopupAlign, PopupSide } from '../../internal/popup/placement';
import type { ControlSize, StyleProps } from '../../theme';
import type { MenuListProps } from '../menu/menu-list';
import { MenuPopup } from '../menu/menu-popup';
import type { MenuItem } from '../menu/types';

type PressEvent = PointerEvent | KeyboardEvent | AccessibilityActionEvent;

/** What a Dropdown's trigger takes: a Button, a Pressable, or a component of yours that passes them on. */
export interface DropdownTriggerProps {
  onPress?: (event: PressEvent) => void;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  children?: unknown;
}

export interface DropdownProps extends StyleProps<'Menu'>, OpenStateProps {
  /**
   * What opens the menu: an element with `onPress`, such as a Button. Its own
   * `onPress` still runs. The menu is placed beside the node that was pressed.
   */
  trigger: ReactElement<DropdownTriggerProps>;
  items: readonly MenuItem[];
  /** The side of the trigger the menu opens on, when there is room: below by default. */
  side?: PopupSide;
  /** Along that side: the trigger's start (the default), centre or end. */
  align?: PopupAlign;
  /** Room between the trigger and the menu. */
  offset?: number;
  size?: ControlSize;
  /** What assistive technology calls the menu. */
  accessibilityLabel?: string;
  debugId?: string;
}

/**
 * A menu of actions opened from a trigger of your own: a Button's options,
 * a panel's commands. It closes on a choice, Escape, Tab, or a press outside,
 * and gives focus back to the trigger.
 */
export function Dropdown({
  trigger,
  items,
  side = 'bottom',
  align = 'start',
  offset = 4,
  size = 'md',
  open: openProp,
  defaultOpen,
  onOpenChange,
  accessibilityLabel,
  debugId,
  ...styles
}: DropdownProps) {
  const popup = useOpenState({ open: openProp, defaultOpen, onOpenChange });
  // The node pressed: the menu opens beside it.
  const [pressed, setPressed] = useState<UiNode | null>(null);
  const anchor = useMemo(() => ({ current: pressed }), [pressed]);
  const [focus, setFocus] = useState<MenuListProps['initialFocus']>('first');
  const own = trigger.props;
  const button = cloneElement(trigger, {
    accessibilityState: { ...own.accessibilityState, expanded: popup.open },
    onPress: (event: PressEvent) => {
      own.onPress?.(event);
      if (event.currentTarget) setPressed(event.currentTarget);
      // From the pointer, focus goes to the menu, with nothing highlighted
      // until the pointer or a key moves; from the keyboard or assistive
      // technology, to the first item.
      setFocus(
        event.type === 'click' || event.type.startsWith('pointer')
          ? 'list'
          : 'first',
      );
      popup.setOpen(!popup.open);
    },
  });
  return (
    <>
      {button}
      {popup.open && (
        <MenuPopup
          {...styles}
          items={items}
          anchor={anchor}
          side={side}
          align={align}
          offset={offset}
          size={size}
          label={
            accessibilityLabel ??
            own.accessibilityLabel ??
            (typeof own.children === 'string' ? own.children : undefined)
          }
          initialFocus={focus}
          close={() => popup.setOpen(false)}
          debugId={debugId}
        />
      )}
    </>
  );
}

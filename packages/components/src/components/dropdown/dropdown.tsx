import type { AccessibilityState } from '@soundor/react';
import {
  cloneElement,
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  type Ref,
} from 'react';
import type {
  AccessibilityActionEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
} from 'soundor:ui';

import { useMergedRef } from '../../internal/host';
import {
  useOpenState,
  type OpenStateProps,
} from '../../internal/popup/open-state';
import type { PopupAlign, PopupSide } from '../../internal/popup/placement';
import type { PopupAnchor } from '../../internal/popup/popup';
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
  /** Its node: the menu is placed beside it. Yours, if you set one, still gets it. */
  ref?: Ref<UiNode>;
}

export interface DropdownProps extends StyleProps<'Menu'>, OpenStateProps {
  /**
   * What opens the menu: an element with `onPress` and `ref`, such as a
   * Button. Its own `onPress` and `ref` still work. The menu is placed beside
   * it, whether it was pressed or `open` was set.
   */
  trigger: ReactElement<DropdownTriggerProps>;
  items: readonly MenuItem[];
  /**
   * What the menu is placed beside, in place of the trigger: a node of
   * yours, or a point in the view (a menu opened from a shortcut, at the
   * pointer).
   */
  anchor?: PopupAnchor;
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
  anchor: anchorProp,
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
  // The trigger's node, from its first render: a menu opened by setting
  // `open`, before any press, has it to be placed beside.
  const [node, setNode] = useState<UiNode | null>(null);
  const attach = useCallback((value: UiNode | null) => setNode(value), []);
  const own = trigger.props;
  const triggerRef = useMergedRef<UiNode>(attach, own.ref);
  const triggerAnchor = useMemo(() => ({ current: node }), [node]);
  // From the pointer, focus goes to the menu, with nothing highlighted until
  // the pointer or a key moves; from the keyboard, assistive technology, or
  // `open` set by you, to the first item.
  const [focus, setFocus] = useState<MenuListProps['initialFocus']>('first');
  const [wasOpen, setWasOpen] = useState(popup.open);
  if (wasOpen !== popup.open) {
    setWasOpen(popup.open);
    if (!popup.open) setFocus('first');
  }
  const button = cloneElement(trigger, {
    ref: triggerRef,
    accessibilityState: { ...own.accessibilityState, expanded: popup.open },
    onPress: (event: PressEvent) => {
      own.onPress?.(event);
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
          anchor={anchorProp ?? triggerAnchor}
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

import type { AccessibilityState } from '@soundor/react';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
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

type PressEvent = PointerEvent | KeyboardEvent | AccessibilityActionEvent;

/**
 * What a `DropdownMenu.Trigger`'s child must take, and pass on to the node
 * that is pressed: a Button, a Pressable, or a component of yours.
 *
 * - `ref`: its pressable node. The menu is placed beside it.
 * - `onPress`: called by a click, Enter, Space and a screen reader's
 *   activate. It opens and closes the menu, after the child's own.
 * - `accessibilityState`: gains `expanded` while the menu is open.
 *
 * Its own `ref`, `onPress` and `accessibilityState` keep working. Its label
 * names the menu, unless the content has an `accessibilityLabel`. A child
 * whose primary press does something else as well (a toggle, a drag) does
 * both: give the trigger a control whose press is only to open the menu.
 */
export interface DropdownMenuTriggerTarget {
  ref?: Ref<UiNode>;
  onPress?: (event: PressEvent) => void;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  children?: unknown;
}

export type DropdownMenuProps = OpenStateProps & {
  /** A `DropdownMenu.Trigger` and a `DropdownMenu.Content`, at any depth. */
  children?: ReactNode;
};

export interface DropdownMenuTriggerProps {
  /** One element that takes `ref`, `onPress` and `accessibilityState`. */
  children: ReactElement<DropdownMenuTriggerTarget>;
}

export interface DropdownMenuContentProps extends StyleProps<'Menu'> {
  /** `Menu.Item`s, `Menu.Divider`s and `Menu.Label`s, and components of yours that render them. */
  children?: ReactNode;
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
  /** What assistive technology calls the menu: the trigger's label by default. */
  accessibilityLabel?: string;
  debugId?: string;
}

interface DropdownMenuContext {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Where focus goes as it opens: from the pointer, the list itself. */
  focus: MenuListProps['initialFocus'];
  setFocus: (focus: MenuListProps['initialFocus']) => void;
  node: UiNode | null;
  attach: (node: UiNode | null) => void;
  label: string | undefined;
  setLabel: (label: string | undefined) => void;
}

const Context = createContext<DropdownMenuContext | null>(null);

function useDropdownMenu(part: string) {
  const menu = useContext(Context);
  if (!menu) throw new Error(`${part} belongs inside a DropdownMenu.`);
  return menu;
}

/**
 * A menu of actions opened from a control of your own: a Button's options,
 * a panel's commands. It closes on a choice, Escape, Tab, or a press outside,
 * and gives focus back to the trigger.
 *
 *   <DropdownMenu>
 *     <DropdownMenu.Trigger>
 *       <Button>Preset</Button>
 *     </DropdownMenu.Trigger>
 *     <DropdownMenu.Content>
 *       <Menu.Item onPress={save}>Save</Menu.Item>
 *     </DropdownMenu.Content>
 *   </DropdownMenu>
 */
function DropdownMenuRoot({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const popup = useOpenState({ open: openProp, defaultOpen, onOpenChange });
  // The trigger's node, from its first render: a menu opened by setting
  // `open`, before any press, has it to be placed beside.
  const [node, setNode] = useState<UiNode | null>(null);
  const attach = useCallback((value: UiNode | null) => setNode(value), []);
  const [label, setLabel] = useState<string | undefined>(undefined);
  // From the pointer, focus goes to the menu, with nothing highlighted until
  // the pointer or a key moves; from the keyboard, assistive technology, or
  // `open` set by you, to the first item.
  const [focus, setFocus] = useState<MenuListProps['initialFocus']>('first');
  const [wasOpen, setWasOpen] = useState(popup.open);
  if (wasOpen !== popup.open) {
    setWasOpen(popup.open);
    if (!popup.open) setFocus('first');
  }
  const { open, setOpen } = popup;
  const context = useMemo(
    () => ({ open, setOpen, focus, setFocus, node, attach, label, setLabel }),
    [open, setOpen, focus, node, attach, label],
  );
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

/**
 * Makes its child the menu's trigger, adding no view of its own: the child
 * keeps its look, its label and its disabled state, and gains the menu.
 */
function Trigger({ children }: DropdownMenuTriggerProps) {
  const menu = useDropdownMenu('DropdownMenu.Trigger');
  const child = Children.only(children);
  if (!isValidElement<DropdownMenuTriggerTarget>(child))
    throw new Error('DropdownMenu.Trigger takes one element.');
  const own = child.props;
  const ref = useMergedRef<UiNode>(menu.attach, own.ref);
  const label =
    own.accessibilityLabel ??
    (typeof own.children === 'string' ? own.children : undefined);
  const { setLabel } = menu;
  useLayoutEffect(() => setLabel(label), [label, setLabel]);
  return cloneElement(child, {
    ref,
    accessibilityState: { ...own.accessibilityState, expanded: menu.open },
    onPress: (event: PressEvent) => {
      own.onPress?.(event);
      menu.setFocus(
        event.type === 'click' || event.type.startsWith('pointer')
          ? 'list'
          : 'first',
      );
      menu.setOpen(!menu.open);
    },
  });
}

/** The menu, shown beside the trigger while it is open. */
function Content({
  children,
  anchor,
  side = 'bottom',
  align = 'start',
  offset = 4,
  size = 'md',
  accessibilityLabel,
  debugId,
  ...styles
}: DropdownMenuContentProps) {
  const menu = useDropdownMenu('DropdownMenu.Content');
  const { node, setOpen } = menu;
  const triggerAnchor = useMemo(() => ({ current: node }), [node]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  if (!menu.open) return null;
  return (
    <MenuPopup
      {...styles}
      anchor={anchor ?? triggerAnchor}
      side={side}
      align={align}
      offset={offset}
      size={size}
      label={accessibilityLabel ?? menu.label}
      initialFocus={menu.focus}
      close={close}
      debugId={debugId}
    >
      {children}
    </MenuPopup>
  );
}

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
});

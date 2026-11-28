import type { ReactNode } from 'react';

import {
  MenuDivider,
  MenuHeading,
  MenuRow,
  type MenuRowState,
} from './menu-list';
import { Sub, SubContent, SubTrigger } from './submenu';

export interface MenuItemProps {
  /** Its label: what it says, what a screen reader reads, what typing finds. */
  children: string;
  /**
   * Chosen: by a click, Enter or Space. The menu has closed, and given focus
   * back, by the time it runs, so it may open another overlay, or unmount
   * the menu's owner.
   */
  onPress?: () => void;
  /** Shown, dimmed, and skipped by the keyboard. */
  disabled?: boolean;
  /**
   * Before the label: a small glyph of your own, in the label's colour. A
   * function draws it from the row's state, in `state.color` to follow the
   * label as the row is highlighted or chosen.
   */
  icon?: ReactNode | ((state: MenuItemState) => ReactNode);
  /** Read after the label, for what it is not clear from it. */
  hint?: string;
  /**
   * A tick before the label, for an option that is on. Every item of a menu
   * with one leaves room for the tick.
   */
  checked?: boolean;
  /**
   * How `checked` shows: `'tick'` (the default) puts a tick before the
   * label; `'highlight'` fills the row with the selection accent and leaves
   * the tick out, as a Select shows its chosen option. Give it to every item
   * of a group of choices. Either way the row reports `checked` to assistive
   * technology.
   */
  checkedStyle?: 'tick' | 'highlight';
}

/** What an item's `icon` function draws from. */
export type MenuItemState = MenuRowState;

function Item({
  children,
  onPress,
  disabled,
  icon,
  hint,
  checked,
  checkedStyle = 'tick',
}: MenuItemProps) {
  const highlight = checkedStyle === 'highlight';
  return (
    <MenuRow
      label={children}
      select={onPress}
      disabled={disabled}
      icon={typeof icon === 'function' ? undefined : icon}
      renderIcon={typeof icon === 'function' ? icon : undefined}
      hint={hint}
      checked={checked}
      highlightChecked={highlight}
      hideCheckmark={highlight}
    />
  );
}

/** A line between groups of items. */
function Divider() {
  return <MenuDivider />;
}

export interface MenuLabelProps {
  /** The heading's text. */
  children: string;
}

/** A heading over a group of items: read by a screen reader, never chosen. */
function Label({ children }: MenuLabelProps) {
  return <MenuHeading>{children}</MenuHeading>;
}

/**
 * What goes in a menu: the same in a `DropdownMenu.Content` and a
 * `ContextMenu.Content`, and in any component of yours rendered there.
 *
 *   function ParameterActions({ parameter }) {
 *     return (
 *       <>
 *         <Menu.Item onPress={() => reset(parameter)}>Reset</Menu.Item>
 *         <Menu.Item onPress={() => copy(parameter)}>Copy value</Menu.Item>
 *       </>
 *     );
 *   }
 *
 * A `Menu.Sub` is a row that opens another menu beside it: a
 * `Menu.SubTrigger` and the `Menu.SubContent` it opens, which takes the
 * same parts, other `Menu.Sub`s included.
 *
 * `Menu` is only their namespace: a menu is a `DropdownMenu` or a
 * `ContextMenu`. Used outside one, they throw.
 */
export const Menu = {
  Item,
  Divider,
  Label,
  Sub,
  SubTrigger,
  SubContent,
} as const;

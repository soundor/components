import type { ReactNode } from 'react';

import { MenuDivider, MenuHeading, MenuRow } from './menu-list';

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
  /** Before the label: a small glyph of your own, in the label's colour. */
  icon?: ReactNode;
  /** Read after the label, for what it is not clear from it. */
  hint?: string;
  /**
   * A tick before the label, for an option that is on. Every item of a menu
   * with one leaves room for the tick.
   */
  checked?: boolean;
}

function Item({
  children,
  onPress,
  disabled,
  icon,
  hint,
  checked,
}: MenuItemProps) {
  return (
    <MenuRow
      label={children}
      select={onPress}
      disabled={disabled}
      icon={icon}
      hint={hint}
      checked={checked}
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
 * `Menu` is only their namespace: a menu is a `DropdownMenu` or a
 * `ContextMenu`. Used outside one, they throw.
 */
export const Menu = { Item, Divider, Label } as const;

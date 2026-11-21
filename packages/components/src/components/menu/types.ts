import type { ReactNode } from 'react';

/** A command in a Dropdown or ContextMenu. */
export interface MenuAction {
  type?: 'item';
  /** Unique among the menu's items. */
  id: string;
  label: string;
  /**
   * Chosen: by a click, Enter or Space. The menu has closed, and given focus
   * back, by the time it runs, so it may open another overlay, or unmount
   * the menu's owner.
   */
  onSelect?: () => void;
  /** Shown, dimmed, and skipped by the keyboard. */
  disabled?: boolean;
  /** Before the label: a small glyph of your own, in the label's colour. */
  icon?: ReactNode;
  /**
   * A keyboard shortcut shown after the label, such as `⌘C`. Only shown: the
   * menu does not bind it, as shortcuts belong to the editor.
   */
  shortcut?: string;
  /** Read after the label, for what it is not clear from it. */
  hint?: string;
  /** A tick before the label, for an option that is on. */
  checked?: boolean;
}

/** A line between groups of items. */
export interface MenuSeparator {
  type: 'separator';
  id?: string;
}

export type MenuItem = MenuAction | MenuSeparator;

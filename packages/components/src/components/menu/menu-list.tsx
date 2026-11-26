import {
  Text,
  View,
  flushSync,
  usePressable,
  useScrollbar,
  type StyleProp,
} from '@soundor/react';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  focusedNode,
  type AccessibilityActionEvent,
  type KeyboardEvent,
  type PointerEvent,
  type UiNode,
} from 'soundor:ui';

import {
  firstEnabled,
  jumpEnabled,
  lastEnabled,
  matchLabel,
  stepEnabled,
} from '../../internal/menu/navigation';
import {
  useSubmenuAim,
  type OpenSubmenu,
} from '../../internal/menu/use-submenu-aim';
import {
  controlHeight,
  textStyle,
  useTheme,
  type ControlSize,
  type Theme,
} from '../../theme';
import { CheckIcon, SubmenuIcon } from '../shared/icons';

export interface MenuRowState {
  /** The foreground color used for this option's label. */
  color: string;
  /** Highlighted: under the pointer, or reached with the keyboard. */
  active: boolean;
  checked: boolean;
  disabled: boolean;
}

export type MenuPart =
  | 'root'
  | 'item'
  | 'itemOpen'
  | 'label'
  | 'icon'
  | 'chevron'
  | 'separator'
  | 'heading';

export interface MenuListProps {
  /**
   * The rows: `MenuRow`s, dividers and headings, at any depth (fragments,
   * conditions, components of your own). Their order on screen is their
   * order for the keyboard.
   */
  children?: ReactNode;
  /**
   * What has focus when the list opens: the first or the last enabled row
   * (opened with the keyboard), the checked row (a Select's chosen option,
   * or the first if it can't be), or the list itself (opened with the
   * pointer, nothing highlighted yet). A submenu opened by the pointer
   * takes none: focus stays on its trigger.
   */
  initialFocus: 'first' | 'last' | 'checked' | 'list' | 'none';
  /** What assistive technology calls the menu. */
  label?: string;
  /**
   * Leave room for a tick before every label. A list with a row that has
   * `checked` set does, without it.
   */
  checkable?: boolean;
  size: ControlSize;
  /**
   * Closes the popup; a choice runs after it has. A list with no row in it
   * closes as it opens: there is nothing to choose.
   */
  close: () => void;
  /**
   * Closes the whole menu, submenus and all, for a choice: `close` by
   * default. A submenu's list is given its root's.
   */
  closeAll?: () => void;
  /** A part's style, with the theme's and the instance's slots. */
  part: (part: MenuPart, base?: StyleProp) => StyleProp;
  /** The surface the list is on: a submenu opens beside it. */
  surface?: RefObject<UiNode | null>;
  /** Moves focus to the first row: a submenu already open, entered from the keyboard. */
  handle?: RefObject<MenuListHandle | null>;
}

export interface MenuListHandle {
  focusFirst: () => void;
}

/** What a row tells its list: read when the keyboard moves. */
interface RowInfo {
  label: string;
  disabled: boolean;
  checked: boolean;
}

interface MenuListContext {
  size: ControlSize;
  checkable: boolean;
  part: MenuListProps['part'];
  /** A row's node and what the keyboard needs of it, until it unmounts. */
  register: (node: UiNode, info: { current: RowInfo }) => () => void;
  /** A row with `checked` set: every row leaves room for the tick. */
  reportCheckable: () => () => void;
  choose: (select: (() => void) | undefined) => void;
  /** Closes the whole menu. */
  closeAll: () => void;
  /** The list's surface. */
  surface: () => UiNode | null;
  /** The pointer came over a row, or left it; `accept` highlights it. */
  hoverIn: (node: UiNode, accept: () => void) => void;
  hoverOut: (node: UiNode) => void;
  /** A row's submenu opened; the function returned says it closed. */
  openSubmenu: (submenu: OpenSubmenu) => () => void;
}

const ListContext = createContext<MenuListContext | null>(null);

/**
 * The list a row is in. Rows render only inside a menu's content: one
 * outside is a mistake, said at once rather than drawn without a menu.
 */
export function useMenuList(component: string): MenuListContext {
  const list = useContext(ListContext);
  if (!list)
    throw new Error(
      `${component} belongs inside a DropdownMenu.Content or a ContextMenu.Content.`,
    );
  return list;
}

const pageLength = 8;
const typeaheadDelay = 600;

export function rowHeight(theme: Theme, size: ControlSize) {
  return controlHeight(theme, size) - theme.spacing.spaceXs;
}

/** The raised surface a menu or a list of options shows on. */
export function surfaceStyle(theme: Theme) {
  return {
    minWidth: 120,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: theme.size.borderHairline,
    borderColor: theme.color.border,
    borderRadius: theme.radius.radiusMd,
    overflow: 'hidden',
    boxShadow: [
      { offsetY: 1, blur: 2, color: theme.color.shadow },
      { offsetY: 6, blur: 18, color: theme.color.shadow },
    ],
  } as const;
}

/**
 * The rows under `root` that registered, in the order they are laid out:
 * the tree's order, whatever order they mounted in. A row's own subtree
 * (its icon and label) holds no rows, and is not searched.
 */
function rowsIn(root: UiNode | null, rows: ReadonlyMap<UiNode, unknown>) {
  const found: UiNode[] = [];
  if (!root || rows.size === 0) return found;
  const visit = (node: UiNode) => {
    for (const child of node.children) {
      if (rows.has(child)) found.push(child);
      else visit(child);
    }
  };
  visit(root);
  return found;
}

/**
 * A menu's rows, or a Select's options, in a popup: one engine for both.
 * Focus moves from row to row (so assistive technology announces each), the
 * pointer highlights what it is over, and the arrow keys, Home, End, Page Up
 * and Page Down skip what is disabled. Typing a label's first letters goes to
 * it. A choice closes the menu first, then runs.
 *
 * Rows find the list through context and register their node with it, so
 * any React composition of them works: the keyboard follows them in the
 * order they are laid out, read from the tree each time a key moves.
 */
export function MenuList({
  children,
  initialFocus,
  label,
  checkable: checkableProp = false,
  size,
  close,
  closeAll,
  part,
  surface,
  handle,
}: MenuListProps) {
  const theme = useTheme();
  const list = useRef<UiNode | null>(null);
  const rows = useRef(new Map<UiNode, { current: RowInfo }>());
  const typed = useRef({ text: '', at: 0 });
  // A bar of the theme's, shown only when the list is longer than its room.
  const { vertical } = useScrollbar(list);
  const [checkables, setCheckables] = useState(0);
  const checkable = checkableProp || checkables > 0;
  const closeRef = useRef(close);
  const closeAllRef = useRef(closeAll ?? close);
  useLayoutEffect(() => {
    closeRef.current = close;
    closeAllRef.current = closeAll ?? close;
  });
  const surfaceOf = useCallback(() => surface?.current ?? null, [surface]);
  const aim = useSubmenuAim(surfaceOf);

  const ordered = () => {
    const nodes = rowsIn(list.current, rows.current);
    const infos = nodes.map((node) => rows.current.get(node)!.current);
    return {
      nodes,
      enabled: infos.map((info) => !info.disabled),
      labels: infos.map((info) => info.label),
      checked: infos.map((info) => info.checked),
    };
  };
  const focusRow = (node: UiNode | undefined, reveal = true) => {
    if (!node) return;
    aim.focused(node);
    node.focus();
    if (reveal) node.scrollIntoView?.({ block: 'nearest' });
  };

  // Focused inside the FocusScope before it looks for something to focus.
  // The rows' own layout effects ran first: they have all registered.
  useLayoutEffect(() => {
    const { nodes, enabled, checked } = ordered();
    if (nodes.length === 0) {
      // Nothing to choose: closed as it opened.
      closeRef.current();
      return;
    }
    const chosen = checked.findIndex((on, i) => on && enabled[i]);
    const index =
      initialFocus === 'first'
        ? firstEnabled(enabled)
        : initialFocus === 'last'
          ? lastEnabled(enabled)
          : initialFocus === 'checked'
            ? chosen >= 0
              ? chosen
              : firstEnabled(enabled)
            : -1;
    if (index >= 0) focusRow(nodes[index]);
    else if (initialFocus === 'list') list.current?.focus();
    // Once, on open: later renders keep focus where the user put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The list has no height to scroll in until the popup is placed and held
  // to the room it has: then, and when its height changes again, the focused
  // row is brought into view. Not once the user has scrolled it: a resize
  // then would take the list from where they put it.
  const follow = useRef(true);
  const stopFollowing = () => {
    follow.current = false;
  };
  useLayoutEffect(() => {
    const node = list.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    let height = -1;
    const observer = new ResizeObserver(() => {
      const next = node.clientHeight;
      if (next === height) return;
      height = next;
      const focused = focusedNode();
      if (follow.current && focused && rows.current.has(focused))
        focused.scrollIntoView?.({ block: 'nearest' });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const register = useCallback((node: UiNode, info: { current: RowInfo }) => {
    rows.current.set(node, info);
    return () => {
      if (rows.current.get(node) === info) rows.current.delete(node);
    };
  }, []);
  const reportCheckable = useCallback(() => {
    setCheckables((count) => count + 1);
    return () => setCheckables((count) => count - 1);
  }, []);
  const choose = useCallback((select: (() => void) | undefined) => {
    // Closed, and focus given back, before the action: it may open a modal
    // that should return focus to the trigger, or unmount the menu's owner.
    // A choice in a submenu closes the whole menu.
    flushSync(() => closeAllRef.current());
    select?.();
  }, []);
  const closeEverything = useCallback(() => closeAllRef.current(), []);
  useLayoutEffect(() => {
    if (!handle) return undefined;
    handle.current = {
      focusFirst: () => {
        const { nodes, enabled } = ordered();
        focusRow(nodes[firstEnabled(enabled)]);
      },
    };
    return () => {
      handle.current = null;
    };
  });
  const context = useMemo(
    () => ({
      size,
      checkable,
      part,
      register,
      reportCheckable,
      choose,
      closeAll: closeEverything,
      surface: surfaceOf,
      hoverIn: aim.hoverIn,
      hoverOut: aim.hoverOut,
      openSubmenu: aim.open,
    }),
    [
      size,
      checkable,
      part,
      register,
      reportCheckable,
      choose,
      closeEverything,
      surfaceOf,
      aim,
    ],
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const { nodes, enabled, labels } = ordered();
    const focused = focusedNode();
    const from = focused ? nodes.indexOf(focused) : -1;
    let next = -1;
    switch (event.key) {
      case 'ArrowDown':
        next = stepEnabled(enabled, from, 1);
        break;
      case 'ArrowUp':
        next = stepEnabled(enabled, from, -1);
        break;
      case 'Home':
        next = firstEnabled(enabled);
        break;
      case 'End':
        next = lastEnabled(enabled);
        break;
      case 'PageDown':
        next = jumpEnabled(enabled, from, 1, pageLength);
        break;
      case 'PageUp':
        next =
          from < 0
            ? firstEnabled(enabled)
            : jumpEnabled(enabled, from, -1, pageLength);
        break;
      default: {
        if (event.key.length !== 1 || event.key === ' ') return;
        const now = Date.now();
        const text =
          now - typed.current.at < typeaheadDelay
            ? typed.current.text + event.key
            : event.key;
        typed.current = { text, at: now };
        next = matchLabel(labels, enabled, text, from);
        // "pn" starts nothing: the letter just typed starts a new search.
        if (next < 0 && text.length > 1) {
          typed.current.text = event.key;
          next = matchLabel(labels, enabled, event.key, from);
        }
        if (next < 0) return;
      }
    }
    event.preventDefault();
    if (next >= 0) focusRow(nodes[next]);
  };

  return (
    // A press on the scrollbar, as a wheel on the list, is the user's scroll.
    <View style={{ flexShrink: 1 }} onPointerDown={stopFollowing}>
      <View
        ref={list}
        onWheel={stopFollowing}
        focusable
        accessibilityRole="menu"
        accessibilityLabel={label}
        accessibilityActions={[{ name: 'escape' }]}
        onKeyDown={onKeyDown}
        scrollIndicators={false}
        style={{ flexShrink: 1, overflowY: 'scroll' }}
      >
        {/* Padded inside the scroll view: padding on it would count as
            content past its box, and show a scrollbar for nothing. */}
        <View
          accessible={false}
          style={{
            padding: theme.spacing.spaceXs,
            // Clear of the scrollbar, when there is one.
            paddingRight: vertical.visible
              ? theme.spacing.spaceMd + theme.size.trackSm
              : theme.spacing.spaceXs,
          }}
        >
          <ListContext.Provider value={context}>
            {children}
          </ListContext.Provider>
        </View>
      </View>
      {vertical.visible && (
        <View
          {...vertical.trackProps}
          accessible={false}
          style={{
            position: 'absolute',
            top: theme.spacing.spaceXs,
            bottom: theme.spacing.spaceXs,
            right: theme.spacing.spaceXxs,
            width: theme.size.trackSm,
          }}
        >
          <View
            {...vertical.thumbProps}
            style={{
              width: theme.size.trackSm,
              borderRadius: theme.radius.radiusFull,
              backgroundColor: theme.color.borderStrong,
            }}
          />
        </View>
      )}
    </View>
  );
}

export interface MenuRowProps {
  /** What it says, what assistive technology reads, and what typing finds. */
  label: string;
  /** Shown, dimmed, and skipped by the keyboard. */
  disabled?: boolean;
  /** Before the label: a small glyph of your own, in the label's colour. */
  icon?: ReactNode;
  renderIcon?: (state: MenuRowState) => ReactNode;
  highlightChecked?: boolean;
  hideCheckmark?: boolean;
  /** Read after the label, for what it is not clear from it. */
  hint?: string;
  /** A tick before the label, for an option that is on. */
  checked?: boolean;
  /** In place of the label and icon: a Select's `renderOption`. */
  render?: (state: MenuRowState) => ReactNode;
  /** Chosen: runs once the menu has closed and given focus back. */
  select?: () => void;
  /** What threw for a row outside a list names. */
  component?: string;
  /** In place of choosing: the row opens a submenu. */
  submenu?: MenuRowSubmenu;
  /** The row's node, as it attaches and detaches. */
  nodeRef?: (node: UiNode | null) => void;
}

/** What a submenu's trigger row does in place of a choice. */
export interface MenuRowSubmenu {
  /** Its submenu is open: the row stays highlighted. */
  open: boolean;
  /** Which way its chevron points: the side the submenu prefers. */
  side: 'left' | 'right';
  /** A click, Enter, Space or a screen reader's activate. */
  press: (
    event: PointerEvent | KeyboardEvent | AccessibilityActionEvent,
  ) => void;
  /** Keys on the row, before the list's. */
  keyDown: (event: KeyboardEvent) => void;
  /** The pointer came over the row, and the list highlighted it. */
  hoverIn: () => void;
  hoverOut: () => void;
}

/**
 * One row of a MenuList: a `menuitem` that takes focus as the pointer moves
 * over it, and is chosen by a click, Enter or Space.
 */
export function MenuRow({
  label,
  disabled = false,
  icon,
  renderIcon,
  highlightChecked = false,
  hideCheckmark = false,
  hint,
  checked,
  render,
  select,
  component = 'Menu.Item',
  submenu,
  nodeRef,
}: MenuRowProps) {
  const list = useMenuList(component);
  const { size, checkable, part, register, reportCheckable, choose } = list;
  const { hoverIn, hoverOut } = list;
  const theme = useTheme();
  const c = theme.color;
  const node = useRef<UiNode | null>(null);
  const unregister = useRef<(() => void) | null>(null);
  // Its own focus, from its own events: they arrive from the first focus on,
  // before a pressable's listeners are attached.
  const [focused, setFocused] = useState(false);
  const info = useRef<RowInfo>({ label, disabled, checked: !!checked });
  useLayoutEffect(() => {
    info.current = { label, disabled, checked: !!checked };
  });
  // Registered as its node attaches, in the commit: before the list's
  // first layout effect looks for a row to focus.
  const nodeRefRef = useRef(nodeRef);
  useLayoutEffect(() => {
    nodeRefRef.current = nodeRef;
  });
  const attach = useCallback(
    (value: UiNode | null) => {
      node.current = value;
      unregister.current?.();
      unregister.current = value ? register(value, info) : null;
      nodeRefRef.current?.(value);
    },
    [register],
  );
  // And taken back as it unmounts, whatever the ref is told.
  useLayoutEffect(
    () => () => {
      unregister.current?.();
      unregister.current = null;
    },
    [],
  );
  const hasCheck = checked !== undefined;
  useLayoutEffect(
    () => (hasCheck ? reportCheckable() : undefined),
    [hasCheck, reportCheckable],
  );
  const press = usePressable({
    disabled,
    onPress: (event) => {
      if (disabled) return;
      if (submenu) submenu.press(event);
      else choose(select);
    },
    // The pointer highlights what it is over, as focus does: once it is not
    // on its way to another row's open submenu.
    onHoverIn: () => {
      const own = node.current;
      if (disabled || !own) return;
      hoverIn(own, () => {
        if (!own.focused) own.focus();
        submenu?.hoverIn();
      });
    },
    onHoverOut: () => {
      if (node.current) hoverOut(node.current);
      submenu?.hoverOut();
    },
    accessibilityState: submenu
      ? { expanded: submenu.open, disabled }
      : checkable
        ? { checked: !!checked, disabled }
        : { disabled },
    ref: attach,
  });
  // A trigger stays highlighted while its submenu is open, wherever focus is.
  const open = !!submenu?.open && !disabled;
  const active = (focused || open) && !disabled;
  const selected = highlightChecked && checked && !disabled;
  const foreground = disabled
    ? c.textDisabled
    : active
      ? c.selectedForeground
      : selected
        ? c.accentForeground
        : c.text;
  const state: MenuRowState = {
    active,
    checked: !!checked,
    disabled,
    color: foreground,
  };
  const visualIcon = render ? undefined : (renderIcon?.(state) ?? icon);
  return (
    <View
      {...press.pressableProps}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={submenu?.keyDown}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={[
        part('item', {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.spaceSm,
          minHeight: rowHeight(theme, size),
          paddingHorizontal: theme.spacing.spaceMd,
          borderRadius: theme.radius.radiusSm,
          backgroundColor: active
            ? c.selected
            : selected
              ? c.accent
              : 'transparent',
          cursor: disabled ? 'default' : 'pointer',
        }),
        open && part('itemOpen'),
      ]}
    >
      {render ? (
        render(state)
      ) : (
        <>
          {checkable && !hideCheckmark && (
            <View
              accessible={false}
              style={{ width: 10, alignItems: 'center' }}
            >
              {checked && <CheckIcon color={foreground} />}
            </View>
          )}
          {visualIcon != null && (
            <View
              accessible={false}
              style={part('icon', {
                width: renderIcon ? undefined : 14,
                alignItems: 'center',
                opacity:
                  disabled && !renderIcon ? theme.opacity.opacityDisabled : 1,
              })}
            >
              {visualIcon}
            </View>
          )}
          <Text
            accessible={false}
            numberOfLines={1}
            style={part('label', [
              textStyle(theme, 'body', foreground),
              // Grows into the row, from its own width: a menu is as wide
              // as its longest label.
              { flexGrow: 1, flexShrink: 1, minWidth: 0 },
              size === 'sm' && { fontSize: 10 },
              size === 'lg' && { fontSize: 12 },
            ])}
          >
            {label}
          </Text>
          {submenu && (
            <View
              accessible={false}
              style={part('chevron', {
                alignItems: 'center',
                marginRight: -theme.spacing.spaceXxs,
                opacity: disabled ? theme.opacity.opacityDisabled : 1,
              })}
            >
              <SubmenuIcon color={foreground} side={submenu.side} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** A line between groups of rows. */
export function MenuDivider() {
  const { part } = useMenuList('Menu.Divider');
  const theme = useTheme();
  return (
    <View
      accessible={false}
      style={part('separator', {
        height: theme.size.borderHairline,
        marginVertical: theme.spacing.spaceXs,
        marginHorizontal: theme.spacing.spaceXs,
        backgroundColor: theme.color.divider,
      })}
    />
  );
}

/** A heading over a group of rows: read, never focused or chosen. */
export function MenuHeading({ children }: { children: string }) {
  const { part, size } = useMenuList('Menu.Label');
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      style={part('heading', [
        textStyle(theme, 'technical', theme.color.textMuted),
        {
          paddingHorizontal: theme.spacing.spaceMd,
          paddingTop: theme.spacing.spaceSm,
          paddingBottom: theme.spacing.spaceXs,
        },
        size === 'lg' && { fontSize: 11 },
      ])}
    >
      {children.toUpperCase()}
    </Text>
  );
}

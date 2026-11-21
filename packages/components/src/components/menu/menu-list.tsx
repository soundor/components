import {
  Text,
  View,
  flushSync,
  usePressable,
  useScrollbar,
  type StyleProp,
} from '@soundor/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { focusedNode, type KeyboardEvent, type UiNode } from 'soundor:ui';

import {
  firstEnabled,
  jumpEnabled,
  lastEnabled,
  matchLabel,
  stepEnabled,
} from '../../internal/menu/navigation';
import { formatShortcut } from '../../internal/shortcut';
import {
  controlHeight,
  textStyle,
  useTheme,
  type ControlSize,
  type Theme,
} from '../../theme';
import { CheckIcon } from '../shared/icons';

export interface MenuRowState {
  /** Highlighted: under the pointer, or reached with the keyboard. */
  active: boolean;
  checked: boolean;
  disabled: boolean;
}

export interface MenuEntry {
  key: string;
  label: string;
  separator?: false;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: string;
  hint?: string;
  checked?: boolean;
  /** In place of the label, icon and shortcut. */
  render?: (state: MenuRowState) => ReactNode;
  select?: () => void;
}

export type MenuRow = MenuEntry | { key: string; separator: true };

export type MenuPart = 'item' | 'label' | 'icon' | 'shortcut' | 'separator';

export interface MenuListProps {
  rows: readonly MenuRow[];
  /**
   * What has focus when the list opens: a row by index (the chosen option of
   * a Select), the first or the last enabled row (opened with the keyboard),
   * or the list itself (opened with the pointer, nothing highlighted yet).
   */
  initialFocus: number | 'first' | 'last' | 'list';
  /** What assistive technology calls the menu. */
  label?: string;
  /** Leave room for a tick before every label. */
  checkable?: boolean;
  size: ControlSize;
  /** Closes the popup; a choice runs after it has. */
  close: () => void;
  /** A part's style, with the theme's and the instance's slots. */
  part: (part: MenuPart, base: StyleProp) => StyleProp;
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
 * The rows of a menu, or a Select's options, in a popup: one engine for both.
 * Focus moves from row to row (so assistive technology announces each), the
 * pointer highlights what it is over, and the arrow keys, Home, End, Page Up
 * and Page Down skip what is disabled. Typing a label's first letters goes to
 * it. A choice closes the menu first, then runs.
 */
export function MenuList({
  rows,
  initialFocus,
  label,
  checkable = false,
  size,
  close,
  part,
}: MenuListProps) {
  const theme = useTheme();
  const list = useRef<UiNode | null>(null);
  const nodes = useRef<(UiNode | null)[]>([]);
  const typed = useRef({ text: '', at: 0 });
  // A bar of the theme's, shown only when the list is longer than its room.
  const { vertical } = useScrollbar(list);
  const entries = rows.map((row) => (row.separator ? null : row));
  const enabled = entries.map((entry) => !!entry && !entry.disabled);
  const labels = entries.map((entry) => entry?.label ?? '');

  const focusRow = (index: number, reveal = true) => {
    const node = nodes.current[index];
    if (!node) return;
    node.focus();
    if (reveal) node.scrollIntoView?.({ block: 'nearest' });
  };
  const current = () => {
    const focused = focusedNode();
    return focused ? nodes.current.indexOf(focused) : -1;
  };

  // Focused inside the FocusScope before it looks for something to focus.
  useLayoutEffect(() => {
    const index =
      initialFocus === 'first'
        ? firstEnabled(enabled)
        : initialFocus === 'last'
          ? lastEnabled(enabled)
          : initialFocus === 'list'
            ? -1
            : enabled[initialFocus]
              ? initialFocus
              : firstEnabled(enabled);
    if (index >= 0) focusRow(index);
    else list.current?.focus();
    // Once, on open: later renders keep focus where the user put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (entry: MenuEntry) => {
    if (entry.disabled) return;
    // Closed, and focus given back, before the action: it may open a modal
    // that should return focus to the trigger, or unmount the menu's owner.
    flushSync(close);
    entry.select?.();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const from = current();
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
    if (next >= 0) focusRow(next);
  };

  return (
    <View style={{ flexShrink: 1 }}>
      <View
        ref={list}
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
          {rows.map((row, index) =>
            row.separator ? (
              <View
                key={row.key}
                accessible={false}
                style={part('separator', {
                  height: theme.size.borderHairline,
                  marginVertical: theme.spacing.spaceXs,
                  marginHorizontal: theme.spacing.spaceXs,
                  backgroundColor: theme.color.divider,
                })}
              />
            ) : (
              <Row
                key={row.key}
                entry={row}
                checkable={checkable}
                size={size}
                part={part}
                remember={(node) => {
                  nodes.current[index] = node;
                }}
                choose={() => choose(row)}
              />
            ),
          )}
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

interface RowProps {
  entry: MenuEntry;
  checkable: boolean;
  size: ControlSize;
  part: MenuListProps['part'];
  remember: (node: UiNode | null) => void;
  choose: () => void;
}

function Row({ entry, checkable, size, part, remember, choose }: RowProps) {
  const theme = useTheme();
  const c = theme.color;
  const disabled = !!entry.disabled;
  const checked = !!entry.checked;
  const node = useRef<UiNode | null>(null);
  const press = usePressable({
    disabled,
    onPress: choose,
    // The pointer highlights what it is over, as focus does.
    onHoverIn: () => {
      if (!disabled && !node.current?.focused) node.current?.focus();
    },
    accessibilityState: checkable ? { checked, disabled } : { disabled },
    ref: (value) => {
      node.current = value;
      remember(value);
    },
  });
  const active = press.focused && !disabled;
  const state: MenuRowState = { active, checked, disabled };
  const foreground = disabled
    ? c.textDisabled
    : active
      ? c.selectedForeground
      : c.text;
  const shortcut =
    entry.shortcut === undefined ? undefined : formatShortcut(entry.shortcut);
  const hint =
    entry.hint ??
    (entry.shortcut === undefined
      ? undefined
      : `Shortcut ${formatShortcut(entry.shortcut, { spoken: true })}`);
  return (
    <View
      {...press.pressableProps}
      accessibilityRole="menuitem"
      accessibilityLabel={entry.label}
      accessibilityHint={hint}
      style={part('item', {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.spaceSm,
        minHeight: rowHeight(theme, size),
        paddingHorizontal: theme.spacing.spaceMd,
        borderRadius: theme.radius.radiusSm,
        backgroundColor: active ? c.selected : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
      })}
    >
      {entry.render ? (
        entry.render(state)
      ) : (
        <>
          {checkable && (
            <View
              accessible={false}
              style={{ width: 10, alignItems: 'center' }}
            >
              {checked && <CheckIcon color={foreground} />}
            </View>
          )}
          {entry.icon !== undefined && (
            <View
              accessible={false}
              style={part('icon', {
                width: 14,
                alignItems: 'center',
                opacity: disabled ? theme.opacity.opacityDisabled : 1,
              })}
            >
              {entry.icon}
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
            {entry.label}
          </Text>
          {shortcut !== undefined && (
            <Text
              accessible={false}
              style={part('shortcut', [
                textStyle(
                  theme,
                  'value',
                  disabled
                    ? c.textDisabled
                    : active
                      ? c.textInverse
                      : c.textMuted,
                ),
                { marginLeft: theme.spacing.spaceLg },
              ])}
            >
              {shortcut}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

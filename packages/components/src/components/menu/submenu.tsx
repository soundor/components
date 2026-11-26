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
import type { KeyboardEvent, UiNode } from 'soundor:ui';

import {
  defaultAimOptions,
  type SubmenuAimOptions,
} from '../../internal/menu/submenu-aim';
import { boxOf } from '../../internal/popup/anchor';
import { Popup, type DismissReason } from '../../internal/popup/popup';
import { useTheme } from '../../theme';
import {
  MenuList,
  MenuRow,
  surfaceStyle,
  useMenuList,
  type MenuListHandle,
} from './menu-list';

/** Milliseconds the pointer rests on a `Menu.SubTrigger` before its submenu opens. */
export const defaultSubmenuOpenDelay = 150;

export interface MenuSubProps {
  /** A `Menu.SubTrigger` and a `Menu.SubContent`, at any depth. */
  children?: ReactNode;
  /**
   * The side of the menu the submenu opens on, when there is room: the
   * right by default. It flips to the other side when there isn't. The
   * keys follow it: `→` opens a submenu on the right and `←` closes it;
   * on the left (a right-to-left editor), the other way round.
   */
  side?: 'left' | 'right';
  /** Milliseconds the pointer rests on the trigger before the submenu opens: 150. */
  openDelay?: number;
  /**
   * Milliseconds the pointer may stop, or creep, on its way to the open
   * submenu before the row under it is highlighted instead, and the submenu
   * closes: 100.
   */
  restDelay?: number;
  /**
   * Pixels of slack in the path to the open submenu: around its near edge,
   * and back from the furthest point the pointer reached: 4.
   */
  aimTolerance?: number;
}

export interface MenuSubTriggerProps {
  /** Its label: what it says, what a screen reader reads, what typing finds. */
  children: string;
  /** Shown, dimmed, and skipped by the keyboard: its submenu does not open. */
  disabled?: boolean;
  /** Before the label: a small glyph of your own, in the label's colour. */
  icon?: ReactNode;
  /** Read after the label, for what it is not clear from it. */
  hint?: string;
}

export interface MenuSubContentProps {
  /** `Menu.Item`s, `Menu.Divider`s, `Menu.Label`s and `Menu.Sub`s, and components of yours that render them. */
  children?: ReactNode;
  /** What assistive technology calls the submenu: its trigger's label by default. */
  accessibilityLabel?: string;
  debugId?: string;
}

type SubmenuFocus = 'first' | 'none';

interface SubContext {
  open: boolean;
  /** Where focus goes as it opens: from the keyboard, its first row. */
  focus: SubmenuFocus;
  /** Opens it; from the keyboard, focus goes to its first row even if it was open. */
  show: (focus: SubmenuFocus) => void;
  hide: () => void;
  trigger: UiNode | null;
  attach: (node: UiNode | null) => void;
  label: string | undefined;
  setLabel: (label: string | undefined) => void;
  side: 'left' | 'right';
  openDelay: number;
  aim: Partial<SubmenuAimOptions>;
  surface: RefObject<UiNode | null>;
  handle: RefObject<MenuListHandle | null>;
  /** A part said it is here: a second of the same part throws. */
  claim: (part: 'trigger' | 'content') => () => void;
}

const Context = createContext<SubContext | null>(null);

function useSub(part: string) {
  const sub = useContext(Context);
  if (!sub) throw new Error(`${part} belongs inside a Menu.Sub.`);
  return sub;
}

/**
 * A row that opens another menu beside it: a `Menu.SubTrigger`, and the
 * `Menu.SubContent` it opens. Submenus nest to any depth, in a DropdownMenu
 * and in a ContextMenu.
 *
 *   <Menu.Sub>
 *     <Menu.SubTrigger>Filter type</Menu.SubTrigger>
 *     <Menu.SubContent>
 *       <Menu.Item checked>Bell</Menu.Item>
 *     </Menu.SubContent>
 *   </Menu.Sub>
 */
export function Sub({
  children,
  side = 'right',
  openDelay = defaultSubmenuOpenDelay,
  restDelay = defaultAimOptions.restDelay,
  aimTolerance = defaultAimOptions.tolerance,
}: MenuSubProps) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<SubmenuFocus>('none');
  const [trigger, setTrigger] = useState<UiNode | null>(null);
  const [label, setLabel] = useState<string | undefined>(undefined);
  const surface = useRef<UiNode | null>(null);
  const handle = useRef<MenuListHandle | null>(null);
  const openRef = useRef(open);
  useLayoutEffect(() => {
    openRef.current = open;
  });
  const show = useCallback((next: SubmenuFocus) => {
    if (openRef.current) {
      if (next === 'first') handle.current?.focusFirst();
      return;
    }
    openRef.current = true;
    setFocus(next);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    openRef.current = false;
    setOpen(false);
  }, []);
  const attach = useCallback((node: UiNode | null) => setTrigger(node), []);
  const claimed = useRef({ trigger: false, content: false });
  const claim = useCallback((part: 'trigger' | 'content') => {
    if (claimed.current[part])
      throw new Error(
        `A Menu.Sub takes one ${part === 'trigger' ? 'Menu.SubTrigger' : 'Menu.SubContent'}.`,
      );
    claimed.current[part] = true;
    return () => {
      claimed.current[part] = false;
    };
  }, []);
  const aim = useMemo(
    () => ({ restDelay, tolerance: aimTolerance }),
    [restDelay, aimTolerance],
  );
  const context = useMemo(
    () => ({
      open,
      focus,
      show,
      hide,
      trigger,
      attach,
      label,
      setLabel,
      side,
      openDelay,
      aim,
      surface,
      handle,
      claim,
    }),
    [
      open,
      focus,
      show,
      hide,
      trigger,
      attach,
      label,
      side,
      openDelay,
      aim,
      claim,
    ],
  );
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

const plain = (event: KeyboardEvent) =>
  !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;

/**
 * The row that opens a submenu, with a chevron after its label. The pointer
 * resting on it opens it, a press opens it at once, and `→`, `Enter` or
 * `Space` open it with focus on its first row. It stays highlighted while
 * its submenu is open.
 */
export function SubTrigger({
  children,
  disabled = false,
  icon,
  hint,
}: MenuSubTriggerProps) {
  const sub = useSub('Menu.SubTrigger');
  const list = useMenuList('Menu.SubTrigger');
  const { claim, setLabel, open, trigger, hide, show, openDelay, aim } = sub;
  useLayoutEffect(() => claim('trigger'), [claim]);
  useLayoutEffect(() => setLabel(children), [children, setLabel]);
  const { openSubmenu } = list;
  const { surface } = sub;
  // Told to the list while open: it keeps the pointer's path to it.
  useLayoutEffect(() => {
    if (!open || !trigger) return undefined;
    return openSubmenu({
      trigger,
      surface: () => surface.current,
      close: hide,
      aim,
    });
  }, [open, trigger, openSubmenu, surface, hide, aim]);
  // Closed with it disabled: nothing opens from a disabled row.
  useLayoutEffect(() => {
    if (disabled && open) hide();
  }, [disabled, open, hide]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useLayoutEffect(() => cancel, []);

  const openKey = sub.side === 'left' ? 'ArrowLeft' : 'ArrowRight';
  return (
    <MenuRow
      label={children}
      disabled={disabled}
      icon={icon}
      hint={hint}
      component="Menu.SubTrigger"
      nodeRef={sub.attach}
      submenu={{
        open,
        side: sub.side,
        press: (event) => {
          cancel();
          // From the pointer, focus stays on the row; from the keyboard or
          // a screen reader, it goes to the submenu's first row.
          show(
            event.type === 'click' || event.type.startsWith('pointer')
              ? 'none'
              : 'first',
          );
        },
        keyDown: (event) => {
          if (disabled || !plain(event)) return;
          if (event.key === openKey) {
            event.preventDefault();
            show('first');
          } else if (event.key === 'Escape' && open) {
            // The innermost menu only: this row's submenu, not its menu.
            event.preventDefault();
            hide();
          }
        },
        hoverIn: () => {
          cancel();
          if (open) return;
          timer.current = setTimeout(
            () => {
              timer.current = null;
              show('none');
            },
            Math.max(0, openDelay),
          );
        },
        hoverOut: cancel,
      }}
    />
  );
}

/** The submenu, beside its trigger's row while it is open. */
export function SubContent(props: MenuSubContentProps) {
  const sub = useSub('Menu.SubContent');
  const list = useMenuList('Menu.SubContent');
  const { claim } = sub;
  useLayoutEffect(() => claim('content'), [claim]);
  if (!sub.open || !sub.trigger) return null;
  return (
    <SubmenuPopup {...props} sub={sub} list={list} trigger={sub.trigger} />
  );
}

function SubmenuPopup({
  children,
  accessibilityLabel,
  debugId,
  sub,
  list,
  trigger,
}: MenuSubContentProps & {
  sub: SubContext;
  list: ReturnType<typeof useMenuList>;
  trigger: UiNode;
}) {
  const theme = useTheme();
  const { surface: parentSurface, closeAll, part, size } = list;
  const { hide, side } = sub;
  // Beside the parent menu's surface, level with the trigger's row: it flips
  // round the whole menu, not into it.
  const anchor = useMemo(
    () => ({
      getRegion: () => {
        const row = boxOf(trigger);
        if (!row) return null;
        const menu = boxOf(parentSurface());
        return menu
          ? { x: menu.x, y: row.y, width: menu.width, height: row.height }
          : row;
      },
    }),
    [trigger, parentSurface],
  );
  const triggerRef = useMemo(() => ({ current: trigger }), [trigger]);
  const onDismiss = useCallback(
    (reason: DismissReason) => (reason === 'tab' ? closeAll() : hide()),
    [closeAll, hide],
  );
  const closeKey = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
  return (
    <Popup
      anchor={anchor}
      side={side}
      align="start"
      // Over the parent's edge by a little, as a submenu is.
      offset={-theme.spacing.spaceXxs}
      // Its first row level with the trigger: up by the list's padding and
      // the surface's border.
      alignOffset={-(theme.spacing.spaceXs + theme.size.borderHairline)}
      // The parent menu stays under the pointer: no backdrop. A press
      // outside both closes them both, each for itself.
      modal={false}
      autoFocus={sub.focus === 'first'}
      triggerRef={triggerRef}
      onDismiss={onDismiss}
      surfaceRef={sub.surface}
      onKeyDown={(event) => {
        if (event.key === closeKey && plain(event)) {
          event.preventDefault();
          hide();
        }
      }}
      debugId={debugId}
      style={part('root', surfaceStyle(theme))}
    >
      <MenuList
        label={accessibilityLabel ?? sub.label}
        size={size}
        initialFocus={sub.focus}
        close={hide}
        closeAll={closeAll}
        part={part}
        surface={sub.surface}
        handle={sub.handle}
      >
        {children}
      </MenuList>
    </Popup>
  );
}

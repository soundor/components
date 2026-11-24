import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { HostProps } from '../../internal/host';
import {
  useContextMenuTrigger,
  type ContextMenuRequest,
} from '../../internal/menu/context-menu-trigger';
import type { ControlSize, StyleProps } from '../../theme';
import { MenuPopup } from '../menu/menu-popup';

export interface ContextMenuProps {
  /** A `ContextMenu.Trigger` and a `ContextMenu.Content`, at any depth. */
  children?: ReactNode;
  /** Opens no menu, and offers no "Show menu". */
  disabled?: boolean;
  /** Opened, or closed. */
  onOpenChange?: (open: boolean) => void;
}

export interface ContextMenuTriggerProps {
  /**
   * What the menu is for: one element that takes `ref` and
   * `accessibilityActions`, such as a Knob or any control of this library,
   * or a View around a group of them. It is not wrapped: it lays out, and
   * is announced, as it would be on its own.
   */
  children: ReactElement<HostProps>;
}

export interface ContextMenuContentProps extends StyleProps<'Menu'> {
  /**
   * `Menu.Item`s, `Menu.Divider`s and `Menu.Label`s, and components of
   * yours that render them. They render as the menu opens, so they show the
   * state at that moment: a parameter at its default has nothing to reset.
   */
  children?: ReactNode;
  size?: ControlSize;
  /** What assistive technology calls the menu. */
  accessibilityLabel?: string;
  debugId?: string;
}

interface ContextMenuContext {
  opening: ContextMenuRequest | null;
  disabled: boolean;
  open: (request: ContextMenuRequest) => void;
  close: () => void;
}

const Context = createContext<ContextMenuContext | null>(null);

function useContextMenu(part: string) {
  const menu = useContext(Context);
  if (!menu) throw new Error(`${part} belongs inside a ContextMenu.`);
  return menu;
}

/**
 * A menu of actions for a control: opened by the platform's secondary press
 * (a right-click, a Control-click) or a long touch at the pointer; from the
 * keyboard with Shift+F10 or the context menu key, and by a screen reader's
 * "Show menu" action, beside the control.
 *
 *   <ContextMenu>
 *     <ContextMenu.Trigger>
 *       <Knob parameter={parameters.gain} />
 *     </ContextMenu.Trigger>
 *     <ContextMenu.Content>
 *       <ParameterMenuItems parameter={parameters.gain} />
 *     </ContextMenu.Content>
 *   </ContextMenu>
 */
function ContextMenuRoot({
  children,
  disabled = false,
  onOpenChange,
}: ContextMenuProps) {
  const [opening, setOpening] = useState<ContextMenuRequest | null>(null);
  const latest = useRef(opening);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      // Unmounted with its menu open: nothing to tell.
      mounted.current = false;
    };
  }, []);
  const changed = useRef(onOpenChange);
  useLayoutEffect(() => {
    changed.current = onOpenChange;
  });
  const open = useCallback((request: ContextMenuRequest) => {
    const reopened = latest.current !== null;
    latest.current = request;
    setOpening(request);
    if (!reopened) changed.current?.(true);
  }, []);
  const close = useCallback(() => {
    if (!mounted.current || latest.current === null) return;
    latest.current = null;
    setOpening(null);
    changed.current?.(false);
  }, []);
  const context = useMemo(
    () => ({ opening, disabled, open, close }),
    [opening, disabled, open, close],
  );
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

/**
 * Gives its child the menu, as a second way in: the child keeps its role,
 * its name, its value and its actions, its focus and its own pointer and
 * keys. A Knob stays a slider, with "Show menu" after its own actions.
 */
function Trigger({ children }: ContextMenuTriggerProps) {
  const menu = useContextMenu('ContextMenu.Trigger');
  const child = Children.only(children);
  if (!isValidElement<HostProps>(child))
    throw new Error('ContextMenu.Trigger takes one element.');
  const host = useContextMenuTrigger(child.props, {
    disabled: menu.disabled,
    onOpen: menu.open,
  });
  return cloneElement(child, host);
}

/** The menu, at the pointer or beside the control, while it is open. */
function Content({
  children,
  size = 'md',
  accessibilityLabel,
  debugId,
  ...styles
}: ContextMenuContentProps) {
  const menu = useContextMenu('ContextMenu.Content');
  const at = menu.opening?.at;
  const anchor = useMemo(
    () =>
      at === undefined ? null : 'addEventListener' in at ? { current: at } : at,
    [at],
  );
  if (!menu.opening || !anchor) return null;
  return (
    <MenuPopup
      {...styles}
      anchor={anchor}
      side="bottom"
      align="start"
      offset={'current' in anchor ? 4 : 2}
      size={size}
      label={accessibilityLabel}
      initialFocus={menu.opening.focus}
      close={menu.close}
      debugId={debugId}
    >
      {children}
    </MenuPopup>
  );
}

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger,
  Content,
});

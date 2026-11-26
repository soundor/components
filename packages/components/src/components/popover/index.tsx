import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import type { UiNode } from 'soundor:ui';

import { useMergedRef } from '../../internal/host';
import {
  useOpenState,
  type OpenStateProps,
} from '../../internal/popup/open-state';
import type { PopupAlign, PopupSide } from '../../internal/popup/placement';
import { Popup, type PopupAnchor } from '../../internal/popup/popup';
import { useComponent, type StyleProps } from '../../theme';
import type { DropdownMenuTriggerTarget } from '../dropdown-menu';
import { surfaceStyle } from '../menu/menu-list';

export interface PopoverProps extends OpenStateProps {
  children?: ReactNode;
}

export interface PopoverTriggerProps {
  children: ReactElement<DropdownMenuTriggerTarget>;
}

export interface PopoverContentProps extends StyleProps<'Popover'> {
  children?: ReactNode;
  /** Overrides the trigger as the location of the surface. */
  anchor?: PopupAnchor;
  side?: PopupSide;
  align?: PopupAlign;
  offset?: number;
  /** Trap focus and block pointer interaction outside. Off by default. */
  modal?: boolean;
  /** Focus the first control on open. Defaults to true. */
  autoFocus?: boolean;
  /** Restore focus on close unless it has already moved elsewhere. */
  restoreFocus?: boolean;
  /** Close on outside press. Set false to edit the anchor while open. */
  dismissOnOutside?: boolean;
  accessibilityLabel: string;
  debugId?: string;
}

const Context = createContext<
  | (ReturnType<typeof useOpenState> & {
      trigger: RefObject<UiNode | null>;
    })
  | null
>(null);

function usePopover(part: string) {
  const value = useContext(Context);
  if (!value) throw new Error(`${part} belongs inside a Popover.`);
  return value;
}

function PopoverRoot({ children, ...state }: PopoverProps) {
  const trigger = useRef<UiNode | null>(null);
  const open = useOpenState(state);
  return (
    <Context.Provider value={{ ...open, trigger }}>{children}</Context.Provider>
  );
}

function Trigger({ children }: PopoverTriggerProps) {
  const popover = usePopover('Popover.Trigger');
  const child = Children.only(children);
  if (!isValidElement<DropdownMenuTriggerTarget>(child))
    throw new Error('Popover.Trigger takes one element.');
  const ref = useMergedRef(popover.trigger, child.props.ref);
  return cloneElement(child, {
    ref,
    accessibilityState: {
      ...child.props.accessibilityState,
      expanded: popover.open,
    },
    onPress: (event) => {
      child.props.onPress?.(event);
      popover.setOpen(!popover.open);
    },
  });
}

function Content({
  children,
  anchor,
  side = 'bottom',
  align = 'start',
  offset,
  modal = false,
  autoFocus = true,
  restoreFocus = true,
  dismissOnOutside = true,
  accessibilityLabel,
  debugId,
  ...styles
}: PopoverContentProps) {
  const popover = usePopover('Popover.Content');
  const { theme, slot } = useComponent('Popover', styles);
  if (!popover.open) return null;
  return (
    <Popup
      anchor={anchor ?? popover.trigger}
      side={side}
      align={align}
      offset={offset}
      modal={modal}
      autoFocus={autoFocus}
      restoreFocus={restoreFocus}
      dismissOnOutside={dismissOnOutside}
      dismissOnTab={false}
      triggerRef={popover.trigger}
      onDismiss={() => popover.setOpen(false)}
      accessibilityRole="dialog"
      accessibilityLabel={accessibilityLabel}
      debugId={debugId}
      style={slot('root', {
        ...surfaceStyle(theme),
        overflowY: 'scroll',
        padding: theme.spacing.spaceMd,
        gap: theme.spacing.spaceSm,
      })}
    >
      {children}
    </Popup>
  );
}

/** An anchored surface for interactive controls. */
export const Popover = Object.assign(PopoverRoot, { Trigger, Content });

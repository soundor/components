import { useRef, type ReactNode } from 'react';
import type { UiNode } from 'soundor:ui';

import type { PopupAlign, PopupSide } from '../../internal/popup/placement';
import { Popup, type PopupAnchor } from '../../internal/popup/popup';
import { useComponent, type ControlSize, type StyleProps } from '../../theme';
import { MenuList, surfaceStyle, type MenuListProps } from './menu-list';

export interface MenuPopupProps extends StyleProps<'Menu'> {
  children?: ReactNode;
  anchor: PopupAnchor;
  side: PopupSide;
  align: PopupAlign;
  offset: number;
  initialFocus: MenuListProps['initialFocus'];
  size: ControlSize;
  label?: string;
  close: () => void;
  debugId?: string;
}

/**
 * A menu in a popup: what a DropdownMenu and a ContextMenu open. Its
 * placement, dismissal and focus scope are the Popup's; its rows, keyboard
 * and choosing, the MenuList's.
 */
export function MenuPopup({
  children,
  anchor,
  side,
  align,
  offset,
  initialFocus,
  size,
  label,
  close,
  debugId,
  ...styles
}: MenuPopupProps) {
  const { theme, slot } = useComponent('Menu', styles);
  const surface = useRef<UiNode | null>(null);
  return (
    <Popup
      anchor={anchor}
      side={side}
      align={align}
      offset={offset}
      onDismiss={close}
      debugId={debugId}
      surfaceRef={surface}
      style={slot('root', surfaceStyle(theme))}
    >
      <MenuList
        label={label}
        size={size}
        initialFocus={initialFocus}
        close={close}
        part={slot}
        surface={surface}
      >
        {children}
      </MenuList>
    </Popup>
  );
}

import type { PopupAlign, PopupSide } from '../../internal/popup/placement';
import { Popup, type PopupAnchor } from '../../internal/popup/popup';
import { useComponent, type ControlSize, type StyleProps } from '../../theme';
import { MenuList, surfaceStyle, type MenuListProps } from './menu-list';
import type { MenuItem } from './types';

export interface MenuPopupProps extends StyleProps<'Menu'> {
  items: readonly MenuItem[];
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

/** A menu of actions in a popup: what a Dropdown and a ContextMenu open. */
export function MenuPopup({
  items,
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
  const checkable = items.some(
    (item) => item.type !== 'separator' && item.checked !== undefined,
  );
  return (
    <Popup
      anchor={anchor}
      side={side}
      align={align}
      offset={offset}
      onDismiss={close}
      debugId={debugId}
      style={slot('root', surfaceStyle(theme))}
    >
      <MenuList
        label={label}
        checkable={checkable}
        size={size}
        initialFocus={initialFocus}
        close={close}
        part={slot}
        rows={items.map((item, index) =>
          item.type === 'separator'
            ? { key: item.id ?? `separator-${index}`, separator: true }
            : {
                key: item.id,
                label: item.label,
                disabled: item.disabled,
                icon: item.icon,
                hint: item.hint,
                checked: item.checked,
                select: item.onSelect,
              },
        )}
      />
    </Popup>
  );
}

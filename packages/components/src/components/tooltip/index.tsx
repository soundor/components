import { Text } from '@soundor/react';
import {
  cloneElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  root,
  overlayRoot,
  type UiNode,
  type PointerEvent,
  type KeyboardEvent,
} from 'soundor:ui';

import { useMergedRef, type HostProps } from '../../internal/host';
import type { PopupAlign, PopupSide } from '../../internal/popup/placement';
import { Popup, type PopupAnchor } from '../../internal/popup/popup';
import { textStyle, useComponent, type StyleProps } from '../../theme';
import { surfaceStyle } from '../menu/menu-list';

export interface TooltipProps extends StyleProps<'Tooltip'> {
  /** A single control forwarding its ref to a Soundor node. */
  children?: ReactElement<HostProps & { accessibilityHint?: string }>;
  content: string;
  anchor?: PopupAnchor;
  side?: PopupSide;
  align?: PopupAlign;
  offset?: number;
  openDelay?: number;
  closeDelay?: number;
  /** Control visibility directly, for example during a value gesture. */
  open?: boolean;
}

/** Supplementary, non-interactive text for a labeled control or an external anchor. */
export function Tooltip({
  children,
  content,
  anchor,
  side = 'top',
  align = 'center',
  offset,
  openDelay = 500,
  closeDelay = 100,
  open,
  ...styles
}: TooltipProps) {
  const { theme, slot } = useComponent('Tooltip', styles);
  const [node, setNode] = useState<UiNode | null>(null);
  const ref = useMergedRef<UiNode>(setNode, children?.props.ref);
  const trigger = useMemo(() => ({ current: node }), [node]);
  const [visible, setVisible] = useState(false);
  const flags = useRef({ hover: false, focus: false, suspended: false });
  useLayoutEffect(() => {
    if (!node || open !== undefined) return undefined;
    const state = flags.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      const next = !state.suspended && (state.hover || state.focus);
      const delay = next ? openDelay : closeDelay;
      timer = setTimeout(() => setVisible(next), Math.max(0, delay));
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.buttons) return;
      state.hover = true;
      state.suspended = false;
      schedule();
    };
    const leave = () => {
      state.hover = false;
      schedule();
    };
    const focus = () => {
      state.focus = node.focused && node.focusVisible;
      if (state.focus) state.suspended = false;
      schedule();
    };
    const hide = () => {
      state.suspended = true;
      clearTimeout(timer);
      setVisible(false);
    };
    const press = (event: PointerEvent) => {
      if (node.contains(event.target) || state.hover || state.focus) hide();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    node.addEventListener('pointerenter', enter);
    node.addEventListener('pointerleave', leave);
    node.addEventListener('focusvisiblechange', focus);
    node.addEventListener('blur', focus);
    for (const layer of [root, overlayRoot]) {
      layer.addEventListener('pointerdown', press, true);
      layer.addEventListener('keydown', key, true);
    }
    return () => {
      clearTimeout(timer);
      state.hover = false;
      state.focus = false;
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', leave);
      node.removeEventListener('focusvisiblechange', focus);
      node.removeEventListener('blur', focus);
      for (const layer of [root, overlayRoot]) {
        layer.removeEventListener('pointerdown', press, true);
        layer.removeEventListener('keydown', key, true);
      }
    };
  }, [node, open, openDelay, closeDelay]);
  return (
    <>
      {children &&
        cloneElement(children, {
          ref,
          accessibilityHint: children.props.accessibilityHint ?? content,
        })}
      {(open ?? (node !== null && visible)) && (anchor || node) && content && (
        <Popup
          anchor={anchor ?? trigger}
          side={side}
          align={align}
          offset={offset}
          modal={false}
          passive
          autoFocus={false}
          restoreFocus={false}
          dismissOnOutside={false}
          dismissOnTab={false}
          onDismiss={() => {}}
          style={slot('root', {
            ...surfaceStyle(theme),
            padding: theme.spacing.spaceSm,
          })}
        >
          <Text
            accessible={false}
            style={slot('label', textStyle(theme, 'caption'))}
          >
            {content}
          </Text>
        </Popup>
      )}
    </>
  );
}

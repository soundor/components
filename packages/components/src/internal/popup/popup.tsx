import {
  FocusScope,
  Portal,
  View,
  useViewSize,
  type AccessibilityRole,
  type StyleProp,
} from '@soundor/react';
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  overlayRoot,
  root,
  type KeyboardEvent,
  type PointerEvent,
  type UiNode,
} from 'soundor:ui';

import { anchorBox, boxOf, watchAnchor, type PopupAnchor } from './anchor';
import {
  computePlacement,
  naturalSize,
  samePlacement,
  type Box,
  type Placement,
  type PopupAlign,
  type PopupSide,
} from './placement';

/** Why a popup asks to close. */
export type DismissReason = 'escape' | 'outside' | 'tab';

export type { PopupAnchor } from './anchor';

export interface PopupProps {
  anchor: PopupAnchor;
  side?: PopupSide;
  align?: PopupAlign;
  offset?: number;
  alignOffset?: number;
  /** Room kept from the edges of the view. */
  padding?: number;
  flip?: boolean;
  /** At least as wide as the anchor: a Select's list under its field. */
  matchAnchorWidth?: boolean;
  modal?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  dismissOnOutside?: boolean;
  dismissOnTab?: boolean;
  /** Also disregard pointer presses on this trigger when positioning elsewhere. */
  triggerRef?: RefObject<UiNode | null>;
  /** Asked to close: Escape, Tab, or a press outside. The owner decides. */
  onDismiss: (reason: DismissReason) => void;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  /** The popup's surface. Its position, and its extent, are the popup's own. */
  style?: StyleProp;
  /** The surface's node, for the owner's focus handling. */
  surfaceRef?: RefObject<UiNode | null>;
  /** Keys pressed in the popup, before its own Escape and Tab. */
  onKeyDown?: (event: KeyboardEvent) => void;
  debugId?: string;
  children?: ReactNode;
}

const fill = {
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
} as const;

/**
 * A floating surface over the editor: an entry of the overlay layer
 * (`Portal`), above everything opened before it, with focus kept inside
 * (`FocusScope`) and given back to where it was when it closes. A press
 * anywhere outside it, Escape and Tab ask it to close.
 *
 * It is placed beside its anchor once it has been laid out, and again when
 * the view, anchor or popup changes size, or the anchor moves.
 */
export function Popup({
  anchor,
  side = 'bottom',
  align = 'start',
  offset = 4,
  alignOffset = 0,
  padding = 4,
  flip = true,
  matchAnchorWidth = false,
  modal = true,
  autoFocus = true,
  restoreFocus = true,
  dismissOnOutside = true,
  dismissOnTab = true,
  triggerRef,
  onDismiss,
  accessibilityRole,
  accessibilityLabel,
  style,
  surfaceRef,
  onKeyDown,
  debugId,
  children,
}: PopupProps) {
  const view = useViewSize();
  const surface = useRef<UiNode | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  // No layout to measure: shown where it would go unconstrained.
  const [unmeasured, setUnmeasured] = useState(false);
  const [minWidth, setMinWidth] = useState<number | undefined>(undefined);
  // The last placement, whose maximums the surface is held to, and the size
  // its content was last known to need.
  const placed = useRef<Placement | null>(null);
  const natural = useRef<{ width: number; height: number } | null>(null);
  const place = useCallback(
    (target: Box | null = anchorBox(anchor)) => {
      const own = boxOf(surface.current);
      if (!own) {
        setUnmeasured(true);
        return;
      }
      if (!target) {
        setUnmeasured(false);
        placed.current = null;
        setPlacement(null);
        return;
      }
      setUnmeasured(false);
      // Not laid out yet: the first layout comes, and the observer with it.
      if (own.width === 0 && own.height === 0) return;
      const { safeArea, scale } = view;
      const bounds =
        safeArea.width > 0 && safeArea.height > 0
          ? safeArea
          : { x: 0, y: 0, width: view.width, height: view.height };
      const size = naturalSize(own, placed.current, natural.current);
      natural.current = size;
      const next = computePlacement(target, size, bounds, {
        side,
        align,
        offset,
        alignOffset,
        padding,
        flip,
        scale,
      });
      if (!samePlacement(placed.current, next)) {
        placed.current = next;
        setPlacement(next);
      }
      setMinWidth(
        matchAnchorWidth ? Math.min(target.width, next.maxWidth) : undefined,
      );
    },
    [
      anchor,
      view,
      side,
      align,
      offset,
      alignOffset,
      padding,
      flip,
      matchAnchorWidth,
    ],
  );

  // Placed before it shows; and again when the view or any option changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize with measured runtime layout
  useLayoutEffect(() => place(), [place]);

  // An anchor that moves without changing size (a list scrolled under it, a
  // panel laid out again) tells no observer: its place is checked each
  // frame while open, and the popup placed again only when it moved.
  useLayoutEffect(() => watchAnchor(anchor, place), [anchor, place]);

  // Sizes change without a render: the popup's content, the anchor's layout.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => place());
    if (surface.current) observer.observe(surface.current);
    const node = 'current' in anchor ? anchor.current : null;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [anchor, place]);

  const keyDown = (event: KeyboardEvent) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (
      event.key === 'Escape' &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      // Handled here, so a Modal the popup was opened from stays open.
      event.preventDefault();
      onDismiss('escape');
    } else if (dismissOnTab && event.key === 'Tab') {
      event.preventDefault();
      onDismiss('tab');
    }
  };

  useLayoutEffect(() => {
    if (modal || !dismissOnOutside) return undefined;
    const outside = (event: PointerEvent) => {
      const node = surface.current;
      const entry = node?.parent;
      if (!node || !entry || node.contains(event.target)) return;
      if (triggerRef?.current?.contains(event.target)) return;
      if ('current' in anchor && anchor.current?.contains(event.target)) return;
      // An overlay opened above us owns its input (including its backdrop).
      const entries = overlayRoot.children;
      for (let i = entries.length - 1; i >= 0; i--) {
        const other = entries[i]!;
        if (other === entry) break;
        if (other.contains(event.target)) return;
      }
      onDismiss('outside');
    };
    root.addEventListener('pointerdown', outside, true);
    overlayRoot.addEventListener('pointerdown', outside, true);
    return () => {
      root.removeEventListener('pointerdown', outside, true);
      overlayRoot.removeEventListener('pointerdown', outside, true);
    };
  }, [modal, dismissOnOutside, anchor, onDismiss, triggerRef]);

  useLayoutEffect(() => {
    if (modal) return undefined;
    const escapeFromAnchor = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (
        triggerRef?.current?.contains(event.target) ||
        ('current' in anchor && anchor.current?.contains(event.target))
      )
        keyDown(event);
    };
    root.addEventListener('keydown', escapeFromAnchor);
    overlayRoot.addEventListener('keydown', escapeFromAnchor);
    return () => {
      root.removeEventListener('keydown', escapeFromAnchor);
      overlayRoot.removeEventListener('keydown', escapeFromAnchor);
    };
  });

  const shown = placement !== null || unmeasured;
  return (
    <Portal>
      <FocusScope
        trapped={modal}
        autoFocus={autoFocus}
        restoreFocus={restoreFocus}
      >
        {modal && (
          <View
            accessible={false}
            style={fill}
            onPointerDown={(event) => {
              // Focus stays in the popup, so closing gives it back.
              event.preventDefault();
              if (dismissOnOutside) onDismiss('outside');
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              if (dismissOnOutside) onDismiss('outside');
            }}
          />
        )}
        <View
          ref={(node) => {
            surface.current = node;
            if (surfaceRef) surfaceRef.current = node;
          }}
          debugId={debugId}
          accessibilityRole={accessibilityRole}
          accessibilityLabel={accessibilityLabel}
          accessibilityActions={[{ name: 'escape' }]}
          onAccessibilityAction={(event) => {
            if (event.actionName !== 'escape') return;
            event.preventDefault();
            onDismiss('escape');
          }}
          onKeyDown={keyDown}
          style={[
            style,
            {
              position: 'absolute',
              left: placement?.x ?? 0,
              top: placement?.y ?? 0,
              // Only what is known: an undefined would undo the owner's own.
              ...(minWidth !== undefined && { minWidth }),
              ...(placement && {
                maxWidth: placement.maxWidth,
                maxHeight: placement.maxHeight,
              }),
              // Laid out, measured and placed before it is seen.
              opacity: shown ? 1 : 0,
              pointerEvents: shown ? undefined : 'none',
            },
          ]}
        >
          {children}
        </View>
      </FocusScope>
    </Portal>
  );
}

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
import type { KeyboardEvent, UiNode } from 'soundor:ui';

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

/** A node to sit beside, or a point (a context menu's) in view coordinates. */
export type PopupAnchor =
  | RefObject<UiNode | null>
  | { readonly x: number; readonly y: number };

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

// The bounds of a node in view coordinates, or nothing where there is no
// layout to ask (the simulated runtime) or nothing laid out yet.
function boxOf(node: UiNode | null | undefined): Box | null {
  if (!node?.isConnected) return null;
  try {
    return node.getBoundingClientRect();
  } catch {
    return null;
  }
}

function anchorBox(anchor: PopupAnchor): Box | null {
  if ('current' in anchor) return boxOf(anchor.current);
  return { x: anchor.x, y: anchor.y, width: 0, height: 0 };
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
 * the view, the anchor or the popup changes size; never on every frame.
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
  const place = useCallback(() => {
    const target = anchorBox(anchor);
    const own = boxOf(surface.current);
    if (!target || !own) {
      setUnmeasured(true);
      return;
    }
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
    if (matchAnchorWidth) setMinWidth(target.width);
  }, [
    anchor,
    view,
    side,
    align,
    offset,
    alignOffset,
    padding,
    flip,
    matchAnchorWidth,
  ]);

  // Placed before it shows; and again when the view or any option changes.
  useLayoutEffect(place, [place]);

  // An anchor that moves without changing size (a list scrolled under it, a
  // panel laid out again) tells no observer: its place is checked each
  // frame while open, and the popup placed again only when it moved.
  useLayoutEffect(() => {
    if (!('current' in anchor) || typeof requestAnimationFrame !== 'function')
      return undefined;
    let last = boxOf(anchor.current);
    let frame = requestAnimationFrame(function check() {
      const box = boxOf(anchor.current);
      if (
        box &&
        last &&
        (box.x !== last.x ||
          box.y !== last.y ||
          box.width !== last.width ||
          box.height !== last.height)
      )
        place();
      last = box;
      frame = requestAnimationFrame(check);
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor, place]);

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
    } else if (event.key === 'Tab') {
      event.preventDefault();
      onDismiss('tab');
    }
  };

  const shown = placement !== null || unmeasured;
  return (
    <Portal>
      <FocusScope trapped autoFocus restoreFocus>
        <View
          accessible={false}
          style={fill}
          onPointerDown={(event) => {
            // Focus stays in the popup, so closing gives it back.
            event.preventDefault();
            onDismiss('outside');
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            onDismiss('outside');
          }}
        />
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
            },
          ]}
        >
          {children}
        </View>
      </FocusScope>
    </Portal>
  );
}

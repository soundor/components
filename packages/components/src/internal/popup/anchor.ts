import type { RefObject } from 'react';
import type { UiNode } from 'soundor:ui';

import type { Box } from './placement';

/** A point or rectangle in the Soundor view's logical coordinates. */
export type PopupRegion = Readonly<{ x: number; y: number } | Box>;

/** A view ref, a region, or a reader for a region that moves outside React. */
export type PopupAnchor =
  | RefObject<UiNode | null>
  | PopupRegion
  | { readonly getRegion: () => PopupRegion | null };

export function boxOf(node: UiNode | null | undefined): Box | null {
  if (!node?.isConnected) return null;
  try {
    return node.getBoundingClientRect();
  } catch {
    // The simulated runtime does not supply layout.
    return null;
  }
}

export function anchorBox(anchor: PopupAnchor): Box | null {
  if ('current' in anchor) return boxOf(anchor.current);
  const region = 'getRegion' in anchor ? anchor.getRegion() : anchor;
  if (!region) return null;
  const { x, y } = region;
  const { width = 0, height = 0 }: Partial<Box> = region;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 0 ||
    height < 0
  )
    return null;
  return { x, y, width, height };
}

/** Resize observations alone do not report position-only layout changes. */
export function watchAnchor(
  anchor: PopupAnchor,
  changed: (box: Box | null) => void,
) {
  if (
    (!('current' in anchor) && !('getRegion' in anchor)) ||
    typeof requestAnimationFrame !== 'function'
  )
    return undefined;
  let last = anchorBox(anchor);
  let active = true;
  let frame = requestAnimationFrame(function check() {
    const box = anchorBox(anchor);
    if (
      (box === null) !== (last === null) ||
      (box &&
        last &&
        (box.x !== last.x ||
          box.y !== last.y ||
          box.width !== last.width ||
          box.height !== last.height))
    )
      changed(box);
    last = box;
    if (active) frame = requestAnimationFrame(check);
  });
  return () => {
    active = false;
    cancelAnimationFrame(frame);
  };
}

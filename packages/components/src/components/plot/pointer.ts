import type { PointerEvent } from 'soundor:ui';

// Logical pixels, independent of display scale.
export function crossedDragThreshold(start: PointerEvent, next: PointerEvent) {
  return Math.hypot(next.pageX - start.pageX, next.pageY - start.pageY) >= 4;
}

/** Soundor owns capture. Bridge unexpected native capture loss on web until
 * the runtime forwards it as a Soundor pointercancel. */
export function watchCaptureLoss(pointerId: number, cancel: () => void) {
  type Listener = (event: { pointerId: number }) => void;
  const window = (
    globalThis as {
      window?: {
        addEventListener(
          type: 'lostpointercapture',
          listener: Listener,
          capture: boolean,
        ): void;
        removeEventListener(
          type: 'lostpointercapture',
          listener: Listener,
          capture: boolean,
        ): void;
      };
    }
  ).window;
  if (!window) return () => {};
  const lost: Listener = (event) => {
    if (event.pointerId === pointerId) cancel();
  };
  window.addEventListener('lostpointercapture', lost, true);
  return () => window.removeEventListener('lostpointercapture', lost, true);
}

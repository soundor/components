import { useEditorSize, type ViewProps } from '@soundor/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { requestEditorSize } from 'soundor:ui';

export interface ResizeGripOptions {
  /** Editor pixels per arrow-key press. Shift multiplies the step by five. */
  keyStep?: number;
  /** Accessible name for the resize handle. */
  accessibilityLabel?: string;
  /** Instructions announced for the resize handle. */
  accessibilityHint?: string;
}

/** Drag and keyboard behavior for a bottom-right editor resize handle. */
export function useResizeGrip({
  keyStep = 10,
  accessibilityLabel = 'Resize the editor',
  accessibilityHint = 'Drag, or use the arrow keys',
}: ResizeGripOptions = {}) {
  const editor = useEditorSize();
  const [focusVisible, setFocusVisible] = useState(false);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(
    () => () => {
      drag.current = null;
    },
    [editor.resizable],
  );

  const handlers: ViewProps = {
    focusable: editor.resizable,
    accessibilityRole: 'button',
    accessibilityLabel,
    accessibilityHint,
    accessibilityState: { disabled: !editor.resizable },
    onFocusVisibleChange: (event) => setFocusVisible(event.focusVisible),
    onPointerDown(event) {
      if (!editor.resizable || event.button !== 0 || drag.current) return;
      event.preventDefault();
      // Screen coordinates stay stable as the view and its zoom change.
      drag.current = {
        pointerId: event.pointerId,
        x: event.screenX,
        y: event.screenY,
        width: editor.width,
        height: editor.height,
      };
    },
    onPointerMove(event) {
      const start = drag.current;
      if (!editor.resizable || !start || start.pointerId !== event.pointerId)
        return;
      requestEditorSize(
        start.width + event.screenX - start.x,
        start.height + event.screenY - start.y,
      );
    },
    onPointerUp(event) {
      if (drag.current?.pointerId === event.pointerId) drag.current = null;
    },
    onPointerCancel(event) {
      const start = drag.current;
      if (!start || start.pointerId !== event.pointerId) return;
      drag.current = null;
      if (editor.resizable) requestEditorSize(start.width, start.height);
    },
    onKeyDown(event) {
      if (!editor.resizable) return;
      const step = keyStep * (event.shiftKey ? 5 : 1);
      let { width, height } = editor;
      switch (event.key) {
        case 'ArrowLeft':
          width -= step;
          break;
        case 'ArrowRight':
          width += step;
          break;
        case 'ArrowUp':
          height -= step;
          break;
        case 'ArrowDown':
          height += step;
          break;
        default:
          return;
      }
      event.preventDefault();
      requestEditorSize(width, height);
    },
  };

  return {
    handlers,
    resizable: editor.resizable,
    focusVisible: editor.resizable && focusVisible,
  };
}

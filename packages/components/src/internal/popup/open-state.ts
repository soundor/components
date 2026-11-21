import { useLayoutEffect, useRef, useState } from 'react';

export interface OpenStateProps {
  /** Controlled: whether it is open; pair it with `onOpenChange`. */
  open?: boolean;
  /** Uncontrolled: whether it starts open. */
  defaultOpen?: boolean;
  /** Asked to open or close: by the trigger, a choice, Escape, or a press outside. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Whether a popup is open, controlled or not. A request after the owner has
 * unmounted (an action that unmounts its own menu) is ignored, and asking for
 * the state it is already in says nothing.
 */
export function useOpenState({
  open,
  defaultOpen = false,
  onOpenChange,
}: OpenStateProps) {
  const [own, setOwn] = useState(defaultOpen);
  const shown = open ?? own;
  const mounted = useRef(true);
  const current = useRef(shown);
  useLayoutEffect(() => {
    current.current = shown;
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const setOpen = (next: boolean) => {
    if (!mounted.current || next === current.current) return;
    current.current = next;
    if (open === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  return { open: shown, setOpen };
}

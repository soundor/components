/**
 * A menu list's hover, while one of its rows has a submenu open: the row the
 * pointer comes over is highlighted only once the pointer is not on its way
 * to the submenu (`createSubmenuAim` decides), and the submenu closes then.
 * With no submenu open, a row is highlighted as the pointer comes over it.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { overlayRoot, root, type PointerEvent, type UiNode } from 'soundor:ui';

import { boxOf } from '../popup/anchor';
import {
  createSubmenuAim,
  type AimPoint,
  type SubmenuAimOptions,
} from './submenu-aim';

/** A submenu open from a row of the list. */
export interface OpenSubmenu {
  /** Its trigger's row. */
  trigger: UiNode;
  /** Its surface, once it is shown. */
  surface: () => UiNode | null;
  /** Closes it. */
  close: () => void;
  aim: Partial<SubmenuAimOptions>;
}

export interface SubmenuAimHandle {
  /** The pointer came over a row: `accept` highlights it, now or once the aim is lost. */
  hoverIn: (node: UiNode, accept: () => void) => void;
  hoverOut: (node: UiNode) => void;
  /** A submenu opened; the function returned says it closed. */
  open: (submenu: OpenSubmenu) => () => void;
  /** Focus moved to a row from the keyboard: any other row's submenu closes. */
  focused: (node: UiNode) => void;
}

const now = () => Date.now();

/**
 * @param surface The list's own surface: a move onto it, off every row and
 *   off course, closes the submenu. Off the menu altogether, it stays open.
 */
export function useSubmenuAim(surface: () => UiNode | null): SubmenuAimHandle {
  const submenu = useRef<OpenSubmenu | null>(null);
  const aim = useRef(createSubmenuAim());
  // The row under the pointer, not yet highlighted.
  const pending = useRef<{ node: UiNode; accept: () => void } | null>(null);
  const pointer = useRef<{ point: AimPoint; time: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surfaceRef = useRef(surface);
  useLayoutEffect(() => {
    surfaceRef.current = surface;
  });

  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const switchRows = () => {
    const open = submenu.current;
    if (!open) return;
    clear();
    const next = pending.current;
    pending.current = null;
    // The row first: focus is out of the submenu as it closes, and is not
    // given back to its trigger.
    next?.accept();
    open.close();
  };
  // At rest, the aim runs out: checked when it would.
  const schedule = () => {
    clear();
    const deadline = aim.current.deadline();
    if (deadline === null || !pending.current) return;
    timer.current = setTimeout(
      () => {
        timer.current = null;
        if (aim.current.check(now()) === 'switch' && pending.current)
          switchRows();
      },
      Math.max(0, deadline - now()),
    );
  };

  useLayoutEffect(() => {
    const move = (event: PointerEvent) => {
      const point = { x: event.pageX, y: event.pageY };
      const time = now();
      pointer.current = { point, time };
      const open = submenu.current;
      if (!open) return;
      const trigger = boxOf(open.trigger);
      const box = boxOf(open.surface());
      // No layout (the simulated runtime): no path to follow. Off its
      // trigger, the row under the pointer has it.
      const onTrigger = !!event.target && open.trigger.contains(event.target);
      const decision =
        trigger && box
          ? aim.current.move(point, time, trigger, box)
          : onTrigger
            ? 'stay'
            : 'switch';
      if (decision === 'stay') return schedule();
      const own = surfaceRef.current();
      const onList = !!event.target && !!own?.contains(event.target);
      if (pending.current || onList) switchRows();
    };
    root.addEventListener('pointermove', move, true);
    overlayRoot.addEventListener('pointermove', move, true);
    return () => {
      root.removeEventListener('pointermove', move, true);
      overlayRoot.removeEventListener('pointermove', move, true);
      clear();
    };
  }, []);

  const hoverIn = useCallback((node: UiNode, accept: () => void) => {
    const open = submenu.current;
    if (!open || node === open.trigger) {
      pending.current = null;
      clear();
      accept();
      return;
    }
    pending.current = { node, accept };
    // Already off course, or decided by the move that brought it here.
    if (aim.current.decision() === 'switch') switchRows();
    else schedule();
  }, []);
  const hoverOut = useCallback((node: UiNode) => {
    if (pending.current?.node === node) pending.current = null;
  }, []);
  const open = useCallback((next: OpenSubmenu) => {
    const before = submenu.current;
    if (before && before !== next) before.close();
    submenu.current = next;
    pending.current = null;
    clear();
    aim.current = createSubmenuAim(next.aim);
    aim.current.reset(pointer.current?.point, pointer.current?.time);
    return () => {
      if (submenu.current !== next) return;
      submenu.current = null;
      pending.current = null;
      clear();
    };
  }, []);
  const focused = useCallback((node: UiNode) => {
    const open = submenu.current;
    if (open && node !== open.trigger) open.close();
  }, []);
  return useMemo(
    () => ({ hoverIn, hoverOut, open, focused }),
    [hoverIn, hoverOut, open, focused],
  );
}

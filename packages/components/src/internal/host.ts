import { useMemo, type Ref } from 'react';
import type {
  AccessibilityAction,
  AccessibilityActionEvent,
  UiNode,
} from 'soundor:ui';

/**
 * What a control passes through to its focusable node: a ref to it, and
 * accessibility actions of yours after its own. A ContextMenu uses both, to
 * attach to the control and offer the "show menu" action to a screen reader; a DropdownMenu
 * uses the ref to place its menu.
 */
export interface HostProps {
  /** The control's focusable node, combined with the control's own ref. */
  ref?: Ref<UiNode>;
  /**
   * Actions offered to assistive technology after the control's own: a
   * Knob's increment, decrement and setValue stay first, and one of yours
   * with the same name as one of its own is left out.
   */
  accessibilityActions?: readonly AccessibilityAction[];
  /** Asked for an action the control does not handle itself: one of yours. */
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

/** Sets a ref, callback or object, to a node. */
export function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** One callback ref that sets each of them. */
export function mergeRefs<T>(
  ...refs: (Ref<T> | undefined)[]
): (value: T | null) => void {
  return (value) => {
    for (const ref of refs) setRef(ref, value);
  };
}

/**
 * A control's ref and the caller's as one, the same function from render to
 * render while they are the same: a new one each time would detach and
 * attach them on every render.
 */
export function useMergedRef<T>(
  own: Ref<T> | undefined,
  host: Ref<T> | undefined,
): Ref<T> | undefined {
  return useMemo(
    () =>
      host === undefined
        ? own
        : own === undefined
          ? host
          : mergeRefs(own, host),
    [own, host],
  );
}

export interface OwnActions {
  accessibilityActions?: readonly AccessibilityAction[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

/**
 * A control's own actions, with the caller's: the control's first and
 * handled first; the caller's after, for what the control leaves.
 */
export function withActions(
  own: OwnActions,
  host: HostProps | undefined,
): OwnActions {
  if (!host?.accessibilityActions && !host?.onAccessibilityAction) return own;
  const names = new Set((own.accessibilityActions ?? []).map((a) => a.name));
  const extra = (host.accessibilityActions ?? []).filter(
    (action) => !names.has(action.name),
  );
  return {
    accessibilityActions: [...(own.accessibilityActions ?? []), ...extra],
    onAccessibilityAction: (event) => {
      own.onAccessibilityAction?.(event);
      // Its own, done or refused (disabled), are not passed on.
      if (event.defaultPrevented || names.has(event.actionName)) return;
      host.onAccessibilityAction?.(event);
    },
  };
}

/** Takes the HostProps out of a control's props, leaving the rest. */
export function splitHost<P extends HostProps>(
  props: P,
): [HostProps, Omit<P, keyof HostProps>] {
  const { ref, accessibilityActions, onAccessibilityAction, ...rest } = props;
  return [{ ref, accessibilityActions, onAccessibilityAction }, rest];
}

/**
 * Only the caller's actions, for a control whose own (a Pressable's
 * 'activate') are added after: those named in `own` are left out, and not
 * passed on when asked for.
 */
export function extraActions(
  host: HostProps | undefined,
  own: readonly string[],
): OwnActions {
  if (!host?.accessibilityActions && !host?.onAccessibilityAction) return {};
  const names = new Set(own);
  return {
    accessibilityActions: (host.accessibilityActions ?? []).filter(
      (action) => !names.has(action.name),
    ),
    onAccessibilityAction: (event) => {
      if (event.defaultPrevented || names.has(event.actionName)) return;
      host.onAccessibilityAction?.(event);
    },
  };
}

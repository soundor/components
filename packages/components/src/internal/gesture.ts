import { useLayoutEffect, useRef } from 'react';

type Mode = 'pointer' | 'keys' | 'keysX' | 'keysY' | 'wheel' | 'discrete';

interface Active {
  mode: Mode;
  finish: (cancel: boolean) => void;
}

export function useGesture(
  disabled: boolean,
  first: unknown,
  second?: unknown,
) {
  const active = useRef<Active | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const end = (cancel = false) => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const closing = active.current;
    active.current = null;
    closing?.finish(cancel);
  };

  useLayoutEffect(() => end, [disabled, first, second]);

  return {
    is: (mode: Mode) => active.current?.mode === mode,
    start(mode: Mode, begin: () => Active['finish']) {
      if (disabled) return false;
      if (active.current?.mode === 'pointer') return false;
      if (active.current?.mode !== mode || mode === 'discrete') {
        end();
        active.current = { mode, finish: begin() };
      }
      return true;
    },
    deferEnd() {
      clearTimeout(timer.current);
      timer.current = setTimeout(end, 250);
    },
    end,
  };
}

export function beginEdits(
  ...edits: (() => Active['finish'])[]
): Active['finish'] {
  const finish: Active['finish'][] = [];
  const close = (cancel: boolean) => {
    let firstError: unknown;
    let failed = false;
    for (const done of finish.splice(0)) {
      try {
        done(cancel);
      } catch (error) {
        if (!failed) firstError = error;
        failed = true;
      }
    }
    if (failed) throw firstError;
  };
  try {
    for (const begin of edits) finish.push(begin());
  } catch (error) {
    close(false);
    throw error;
  }
  return close;
}

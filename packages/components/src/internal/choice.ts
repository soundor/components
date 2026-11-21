import type { ComponentParameter } from './range';

/** One of the values a choice offers. */
export interface ChoiceOption<T extends string> {
  value: T;
  /** Shown, and what assistive technology reads. */
  label: string;
  /** Shown, dimmed, and skipped by the keyboard. */
  disabled?: boolean;
  /** Read after the label, for what it is not clear from it. */
  hint?: string;
}

/**
 * A generated choice parameter. `T` is inferred from `info` alone: a
 * parameter's `set` also accepts an updater function, which as an inference
 * source widens `T` to `string`.
 */
export type ChoiceParameter<T extends string> = {
  readonly info: {
    readonly default: T;
    readonly options: readonly ChoiceOption<T>[];
  };
} & NoInfer<ComponentParameter<T>>;

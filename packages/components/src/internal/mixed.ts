export const defaultMixedLabel = 'Mixed';

export interface MixedProps {
  /** Show that the edited items differ, without showing a selected value. Defaults to false. */
  mixed?: boolean;
}

export interface MixedLabelProps extends MixedProps {
  /** Text used instead of a value while mixed. Defaults to “Mixed”. */
  mixedLabel?: string;
}

import { View, usePressable } from '@soundor/react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { UiNode } from 'soundor:ui';

import type { ChoiceParameter } from '../../internal/choice';
import {
  extraActions,
  type HostProps,
  type OwnActions,
} from '../../internal/host';
import { useControlValue } from '../../internal/range';
import {
  controlHeight,
  ring,
  textStyle,
  useComponent,
  type ControlSize,
  type StyleProps,
} from '../../theme';
import type { ActionProps } from '../shared/action';
import { Content } from '../shared/content';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  hint?: string;
}

/** A generated choice parameter; see {@link ChoiceParameter}. */
export type SegmentedControlParameter<T extends string> = ChoiceParameter<T>;

interface SegmentedControlBaseProps
  extends ActionProps, HostProps, StyleProps<'SegmentedControl'> {
  label?: string;
  size?: ControlSize;
  fill?: boolean;
}

/**
 * Bound to a parameter. The parameter supplies the options, the value and the
 * label, so none of them can be passed here, and `T` is inferred from it.
 */
export interface SegmentedControlParameterProps<
  T extends string,
> extends SegmentedControlBaseProps {
  parameter: SegmentedControlParameter<T>;
  options?: never;
  value?: never;
  defaultValue?: never;
  onChange?: never;
}

/** Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). */
export interface SegmentedControlValueProps<
  T extends string,
> extends SegmentedControlBaseProps {
  parameter?: undefined;
  options: readonly SegmentOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
}

export type SegmentedControlProps<T extends string> =
  | SegmentedControlParameterProps<T>
  | SegmentedControlValueProps<T>;

interface SegmentProps<T extends string> {
  option: SegmentOption<T>;
  /** The caller's accessibility actions, on each option a screen reader lands on. */
  extra: OwnActions;
  selected: boolean;
  tabbable: boolean;
  disabled: boolean;
  remember: (node: UiNode | null) => void;
  select: () => void;
  styles: StyleProps<'SegmentedControl'>;
  size: ControlSize;
  fill?: boolean;
}

function Segment<T extends string>({
  option,
  selected,
  tabbable,
  disabled,
  remember,
  select,
  styles,
  size,
  fill,
  extra,
}: SegmentProps<T>) {
  const { theme, slot } = useComponent('SegmentedControl', styles);
  const c = theme.color;
  const node = useRef<UiNode | null>(null);
  const { pressableProps, hovered, pressed, focusVisible } = usePressable({
    disabled,
    onPress: select,
    accessibilityState: { checked: selected, disabled },
    accessibilityActions: extra.accessibilityActions,
    ref: (value) => {
      node.current = value;
      remember(value);
    },
  });
  // usePressable's node attachment makes it focusable. Restore the radio
  // group's single tab stop after that effect (including its attach render).
  useEffect(() => {
    if (node.current) node.current.focusable = tabbable;
  });
  return (
    <View
      {...pressableProps}
      onAccessibilityAction={extra.onAccessibilityAction}
      focusable={tabbable}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityHint={option.hint}
      style={slot('segment', {
        height: controlHeight(theme, size),
        minWidth: 48,
        paddingHorizontal: theme.spacing.spaceLg,
        borderRadius: (theme.radius.radiusSm + theme.radius.radiusMd) / 2,
        flex: fill ? 1 : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected
          ? c.selected
          : hovered
            ? c.surfaceInset
            : 'transparent',
        opacity: disabled
          ? theme.opacity.opacityDisabled
          : pressed
            ? theme.opacity.opacityPressed
            : 1,
        cursor: disabled ? 'default' : 'pointer',
        ...ring(theme, focusVisible, -2),
      })}
    >
      <Content
        style={slot(
          'label',
          textStyle(
            theme,
            'button',
            selected ? c.selectedForeground : c.textSecondary,
          ),
        )}
      >
        {option.label}
      </Content>
    </View>
  );
}

export function SegmentedControl<T extends string>({
  parameter,
  options = parameter?.info.options ?? [],
  value,
  defaultValue,
  label = parameter?.info.label,
  onChange,
  size = 'md',
  fill,
  ref,
  accessibilityActions,
  onAccessibilityAction,
  ...props
}: SegmentedControlProps<T>) {
  const host = { accessibilityActions, onAccessibilityAction };
  const { theme, slot } = useComponent('SegmentedControl', props);
  const disabled = props.disabled || parameter?.info.access === 'readOnly';
  const available = options.filter((option) => !option.disabled && !disabled);
  const own = useControlValue<T | undefined>(
    parameter,
    value,
    defaultValue ?? available[0]?.value,
  );
  const tabStop = available.find((o) => o.value === own.value) ?? available[0];
  const nodes = useRef(new Map<T, UiNode>());
  const focusNext = useRef<T | undefined>(undefined);
  useLayoutEffect(() => {
    if (focusNext.current !== undefined)
      nodes.current.get(focusNext.current)?.focus();
    focusNext.current = undefined;
  });
  const select = (option: SegmentOption<T>) => {
    if (
      option.disabled ||
      disabled ||
      option.value === (parameter?.get() ?? own.value)
    )
      return;
    focusNext.current = option.value;
    parameter?.set(option.value, { history: true });
    own.setOwn(option.value);
    onChange?.(option.value);
  };
  const extra = extraActions(host, ['activate']);
  return (
    <View
      // The group: what a popup is placed beside, and where the options'
      // keys and secondary presses arrive.
      ref={ref}
      accessibilityRole="radiogroup"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityHint={props.accessibilityHint}
      debugId={props.debugId}
      accessibilityState={{ disabled }}
      style={slot('root', {
        flexDirection: 'row',
        alignSelf: fill ? 'stretch' : 'flex-start',
        padding: theme.radius.radiusXs,
        borderRadius: theme.radius.radiusLg,
        backgroundColor: theme.color.surface,
        borderWidth: theme.size.borderHairline,
        borderColor: theme.color.border,
      })}
      onKeyDown={(event) => {
        const prev = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
        const next = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        if (
          !available.length ||
          (!prev && !next && event.key !== 'Home' && event.key !== 'End')
        )
          return;
        const index = tabStop ? available.indexOf(tabStop) : 0;
        const option =
          event.key === 'Home'
            ? available[0]
            : event.key === 'End'
              ? available.at(-1)
              : available[
                  (index + available.length + (prev ? -1 : 1)) %
                    available.length
                ];
        if (option) select(option);
        event.preventDefault();
      }}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          option={option}
          selected={own.value === option.value}
          tabbable={tabStop === option}
          disabled={Boolean(disabled || option.disabled)}
          remember={(node) => {
            if (node) nodes.current.set(option.value, node);
            else nodes.current.delete(option.value);
          }}
          select={() => select(option)}
          styles={props}
          extra={extra}
          size={size}
          fill={fill}
        />
      ))}
    </View>
  );
}

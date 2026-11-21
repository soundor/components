import { Text, View, usePressable } from '@soundor/react';
import { useRef, type ReactNode } from 'react';
import type { UiNode } from 'soundor:ui';

import type { ChoiceOption, ChoiceParameter } from '../../internal/choice';
import { extraActions, setRef, type HostProps } from '../../internal/host';
import {
  useOpenState,
  type OpenStateProps,
} from '../../internal/popup/open-state';
import { Popup } from '../../internal/popup/popup';
import { useControlValue } from '../../internal/range';
import {
  controlHeight,
  ring,
  textStyle,
  useComponent,
  type ControlSize,
  type StyleProps,
} from '../../theme';
import { MenuList, surfaceStyle, type MenuRowState } from '../menu/menu-list';
import type { ActionProps } from '../shared/action';
import { ChevronIcon } from '../shared/icons';

/** One of a Select's options. */
export type SelectOption<T extends string> = ChoiceOption<T>;

/** A generated choice parameter: `parameters.filterType`. */
export type SelectParameter<T extends string> = ChoiceParameter<T>;

/** What a custom option is drawn for. */
export type SelectOptionState = MenuRowState;

interface SelectBaseProps<T extends string>
  extends ActionProps, HostProps, StyleProps<'Select'>, OpenStateProps {
  /** Shown above the field, and what assistive technology calls it. */
  label?: string;
  /** Help shown below the field. */
  description?: string;
  /** Shown, dimmed, while no option is chosen. */
  placeholder?: string;
  /**
   * Shows the value and can be focused, but does not open. A read-only
   * parameter makes it read-only.
   */
  readOnly?: boolean;
  size?: ControlSize;
  /** Width in pixels; the list is at least as wide. */
  width?: number;
  /** Where the list opens, when there is room: below the field by default. */
  side?: 'bottom' | 'top';
  /**
   * Draws an option's row in place of its label: a waveform's icon beside its
   * name, say. Keep it one line high.
   */
  renderOption?: (
    option: SelectOption<T>,
    state: SelectOptionState,
  ) => ReactNode;
}

/**
 * Bound to a choice parameter, which supplies the options, the value and the
 * label, so none of them can be passed here, and `T` is inferred from it.
 */
export interface SelectParameterProps<
  T extends string,
> extends SelectBaseProps<T> {
  parameter: SelectParameter<T>;
  options?: never;
  value?: never;
  defaultValue?: never;
  onChange?: never;
}

/** Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). */
export interface SelectValueProps<T extends string> extends SelectBaseProps<T> {
  parameter?: undefined;
  options: readonly SelectOption<T>[];
  value?: T;
  /**
   * The option chosen at first. Without it, the placeholder shows, or the
   * first option when there is no placeholder.
   */
  defaultValue?: T;
  onChange?: (value: T) => void;
}

export type SelectProps<T extends string> =
  | SelectParameterProps<T>
  | SelectValueProps<T>;

/**
 * A field that opens a list of options and shows the one chosen: for a
 * choice with more options than a SegmentedControl has room for, such as a
 * filter type, a waveform or an oversampling factor.
 */
export function Select<T extends string>({
  parameter,
  options = parameter?.info.options ?? [],
  value,
  defaultValue,
  onChange,
  label = parameter?.info.label,
  description,
  placeholder,
  readOnly: readOnlyProp = false,
  size = 'md',
  width = 160,
  side = 'bottom',
  renderOption,
  open: openProp,
  defaultOpen,
  onOpenChange,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  debugId,
  ...props
}: SelectProps<T>) {
  const { theme, slot } = useComponent('Select', props);
  const c = theme.color;
  const readOnly = readOnlyProp || parameter?.info.access === 'readOnly';
  const own = useControlValue<T | undefined>(
    parameter,
    value,
    defaultValue ??
      (placeholder === undefined
        ? options.find((option) => !option.disabled)?.value
        : undefined),
  );
  const chosen = options.find((option) => option.value === own.value);
  const popup = useOpenState({
    open: openProp,
    defaultOpen,
    onOpenChange,
  });
  const open = popup.open && !disabled && !readOnly;
  const trigger = useRef<UiNode | null>(null);
  const choose = (option: SelectOption<T>) => {
    const current = parameter?.get() ?? own.value;
    // The chosen option again changes nothing, and writes nothing.
    if (option.disabled || disabled || readOnly || option.value === current)
      return;
    parameter?.set(option.value, { history: true });
    own.setOwn(option.value);
    onChange?.(option.value);
  };
  const toggle = () => {
    if (disabled || readOnly) return;
    popup.setOpen(!popup.open);
  };
  const extra = extraActions(props, ['activate']);
  const press = usePressable({
    disabled,
    onPress: toggle,
    accessibilityState: { expanded: open, disabled },
    accessibilityActions: extra.accessibilityActions,
    ref: (node) => {
      trigger.current = node;
      setRef(props.ref, node);
    },
  });
  const name = accessibilityLabel ?? label ?? 'Select';
  const shown = chosen?.label ?? placeholder ?? '';
  const empty = chosen === undefined;
  const hint =
    accessibilityHint ?? description ?? (readOnly ? 'Read only' : chosen?.hint);
  const hovered = press.hovered && !readOnly;
  const iconSize = size === 'lg' ? 12 : 10;
  return (
    <View
      style={slot('root', {
        width,
        alignSelf: 'flex-start',
        gap: theme.spacing.spaceXs,
        opacity: disabled ? theme.opacity.opacityDisabled : 1,
      })}
    >
      {label && (
        <Text
          accessible={false}
          style={slot('label', textStyle(theme, 'technical'))}
        >
          {label.toUpperCase()}
        </Text>
      )}
      <View
        {...press.pressableProps}
        onAccessibilityAction={extra.onAccessibilityAction}
        debugId={debugId}
        accessibilityRole="combobox"
        accessibilityLabel={name}
        accessibilityHint={hint}
        accessibilityValue={{ text: chosen?.label ?? placeholder ?? '' }}
        onKeyDown={(event) => {
          if (
            open ||
            disabled ||
            readOnly ||
            event.ctrlKey ||
            event.metaKey ||
            (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
          )
            return;
          event.preventDefault();
          popup.setOpen(true);
        }}
        style={slot('control', {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.spaceSm,
          height: controlHeight(theme, size),
          paddingLeft: theme.spacing.spaceMd,
          paddingRight: theme.spacing.spaceSm,
          borderRadius: theme.radius.radiusSm,
          backgroundColor: c.surfaceInset,
          borderWidth: theme.size.borderHairline,
          borderColor: open || hovered ? c.borderStrong : c.border,
          cursor: disabled || readOnly ? 'default' : 'pointer',
          ...ring(theme, press.focusVisible),
        })}
      >
        <Text
          accessible={false}
          numberOfLines={1}
          style={slot('value', [
            textStyle(theme, 'body', empty ? c.textMuted : c.text),
            { flex: 1, minWidth: 0 },
            size === 'sm' && { fontSize: 10 },
            size === 'lg' && { fontSize: 12 },
          ])}
        >
          {shown}
        </Text>
        {!readOnly && (
          <View accessible={false} style={slot('icon', { opacity: 0.8 })}>
            <ChevronIcon color={c.textSecondary} size={iconSize} />
          </View>
        )}
      </View>
      {description && (
        <Text
          accessible={false}
          style={slot('description', textStyle(theme, 'caption', c.textMuted))}
        >
          {description}
        </Text>
      )}
      {open && (
        <Popup
          anchor={trigger}
          side={side}
          align="start"
          matchAnchorWidth
          onDismiss={() => popup.setOpen(false)}
          style={slot('popup', surfaceStyle(theme))}
        >
          <MenuList
            label={name}
            checkable
            size={size}
            initialFocus={Math.max(
              0,
              options.findIndex((option) => option.value === own.value),
            )}
            close={() => popup.setOpen(false)}
            part={(part, base) =>
              part === 'item' ? slot('option', base) : base
            }
            rows={options.map((option) => ({
              key: option.value,
              label: option.label,
              hint: option.hint,
              disabled: option.disabled,
              checked: option.value === own.value,
              render: renderOption && ((state) => renderOption(option, state)),
              select: () => choose(option),
            }))}
          />
        </Popup>
      )}
    </View>
  );
}

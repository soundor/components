import { Pressable, View } from '@soundor/react';

import { extraActions, type HostProps } from '../../internal/host';
import type { MixedProps } from '../../internal/mixed';
import { useControlValue, type ComponentParameter } from '../../internal/range';
import {
  accents,
  controlHeight,
  ring,
  textStyle,
  useComponent,
  type ControlColor,
  type ControlSize,
  type StyleProps,
} from '../../theme';
import type { ActionProps } from '../shared/action';
import { Content } from '../shared/content';

export interface ToggleProps
  extends ActionProps, HostProps, StyleProps<'Toggle'>, MixedProps {
  parameter?: ComponentParameter<boolean>;
  label?: string;
  offLabel?: string;
  value?: boolean;
  defaultValue?: boolean;
  onChange?: (on: boolean) => void;
  /** What a press applies while mixed. Defaults to 'on'. */
  mixedPress?: 'on' | 'off';
  variant?: 'button' | 'chip' | 'switch';
  size?: ControlSize;
  color?: ControlColor;
}

export function Toggle({
  parameter,
  label = parameter?.info.label,
  offLabel,
  value,
  defaultValue = false,
  mixed = false,
  mixedPress = 'on',
  onChange,
  variant = 'button',
  size = 'md',
  color = 'neutral',
  ref,
  accessibilityActions,
  onAccessibilityAction,
  ...props
}: ToggleProps) {
  const host = { accessibilityActions, onAccessibilityAction };
  const { theme, slot } = useComponent('Toggle', props);
  const c = theme.color;
  const accent = accents(theme, color);
  const own = useControlValue(parameter, value, defaultValue);
  const on = !mixed && own.value;
  const disabled = props.disabled || parameter?.info.access === 'readOnly';
  const shown = mixed || on ? label : (offLabel ?? label);
  const height =
    size === 'lg'
      ? controlHeight(theme, size) + 10
      : controlHeight(theme, size);
  const labelStyle =
    variant === 'chip'
      ? [
          textStyle(theme, 'button', on ? c.positive : c.textSecondary),
          { fontSize: 9, letterSpacing: 0.8 },
        ]
      : variant === 'switch'
        ? [textStyle(theme, 'body'), { fontWeight: 500 }]
        : [
            textStyle(theme, 'button', on ? accent.foreground : c.text),
            { fontSize: size === 'lg' ? 12 : 11, letterSpacing: 1 },
          ];
  return (
    <Pressable
      {...extraActions(host, ['activate'])}
      ref={ref}
      // ARIA switches do not support an indeterminate checked state.
      accessibilityRole={
        mixed ? 'checkbox' : variant === 'switch' ? 'switch' : 'togglebutton'
      }
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{ checked: mixed ? 'mixed' : on }}
      debugId={props.debugId}
      disabled={disabled}
      onPress={() => {
        const next = mixed ? mixedPress === 'on' : !(parameter?.get() ?? on);
        parameter?.set(next, { history: true });
        own.setOwn(next);
        onChange?.(next);
      }}
      style={({ hovered, pressed, focusVisible }) =>
        slot('root', [
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.spaceMd,
            alignSelf: 'flex-start',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled
              ? theme.opacity.opacityDisabled
              : pressed
                ? theme.opacity.opacityPressed
                : 1,
            borderRadius: theme.radius.radiusSm,
            ...ring(theme, focusVisible),
          },
          variant === 'button' && {
            height,
            minWidth: height * 2.4,
            paddingHorizontal: theme.spacing.spaceLg,
            borderRadius:
              size === 'lg' ? theme.radius.radiusLg : theme.radius.radiusMd,
            borderWidth: theme.size.borderHairline,
            borderColor: hovered ? c.borderStrong : on ? accent.edge : c.border,
            backgroundColor: on ? accent.soft : c.surface,
          },
          variant === 'chip' && {
            paddingVertical: theme.spacing.spaceXs,
            paddingHorizontal: theme.spacing.spaceMd,
            backgroundColor: hovered
              ? c.surfaceInset
              : on
                ? c.surface
                : 'transparent',
          },
        ])
      }
    >
      {(variant === 'button' || (variant === 'chip' && mixed)) && (
        <View
          style={slot('indicator', [
            {
              width: 6,
              height: 6,
              borderRadius: theme.radius.radiusFull,
              backgroundColor: on ? accent.foreground : c.textDisabled,
            },
            mixed &&
              slot('mixed', {
                height: theme.size.borderHairline,
                backgroundColor: c.textMuted,
              }),
          ])}
        />
      )}
      {variant === 'switch' && (
        <View
          style={slot('track', {
            width: 28,
            height: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: mixed ? 'center' : on ? 'flex-end' : 'flex-start',
            paddingHorizontal: 2,
            borderRadius: theme.radius.radiusLg,
            borderWidth: theme.size.borderHairline,
            backgroundColor: on ? accent.soft : c.surfaceInset,
            borderColor: on ? accent.edge : c.border,
          })}
        >
          <View
            style={slot('indicator', [
              {
                width: 10,
                height: 10,
                borderRadius: theme.radius.radiusFull,
                backgroundColor: c.control,
              },
              mixed && slot('mixed', { backgroundColor: c.textMuted }),
            ])}
          />
        </View>
      )}
      <Content style={slot('label', labelStyle)}>
        {variant === 'switch' ? shown : shown?.toUpperCase()}
      </Content>
    </Pressable>
  );
}

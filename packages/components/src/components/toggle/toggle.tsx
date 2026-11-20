import { Pressable, View } from '@soundor/react';

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

export interface ToggleProps extends ActionProps, StyleProps<'Toggle'> {
  parameter?: ComponentParameter<boolean>;
  label?: string;
  offLabel?: string;
  value?: boolean;
  defaultValue?: boolean;
  onChange?: (on: boolean) => void;
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
  onChange,
  variant = 'button',
  size = 'md',
  color = 'neutral',
  ...props
}: ToggleProps) {
  const { theme, slot } = useComponent('Toggle', props);
  const c = theme.color;
  const accent = accents(theme, color);
  const own = useControlValue(parameter, value, defaultValue);
  const on = own.value;
  const disabled = props.disabled || parameter?.info.access === 'readOnly';
  const shown = on ? label : (offLabel ?? label);
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
      accessibilityRole={variant === 'switch' ? 'switch' : 'togglebutton'}
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{ checked: on }}
      debugId={props.debugId}
      disabled={disabled}
      onPress={() => {
        const next = !(parameter?.get() ?? on);
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
      {variant === 'button' && (
        <View
          style={slot('indicator', {
            width: 6,
            height: 6,
            borderRadius: theme.radius.radiusFull,
            backgroundColor: on ? accent.foreground : c.textDisabled,
          })}
        />
      )}
      {variant === 'switch' && (
        <View
          style={slot('track', {
            width: 28,
            height: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: on ? 'flex-end' : 'flex-start',
            paddingHorizontal: 2,
            borderRadius: theme.radius.radiusLg,
            borderWidth: theme.size.borderHairline,
            backgroundColor: on ? accent.soft : c.surfaceInset,
            borderColor: on ? accent.edge : c.border,
          })}
        >
          <View
            style={slot('indicator', {
              width: 10,
              height: 10,
              borderRadius: theme.radius.radiusFull,
              backgroundColor: c.control,
            })}
          />
        </View>
      )}
      <Content style={slot('label', labelStyle)}>
        {variant === 'switch' ? shown : shown?.toUpperCase()}
      </Content>
    </Pressable>
  );
}

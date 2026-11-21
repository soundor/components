import { Pressable, View, type AccessibilityState } from '@soundor/react';
import { type ReactNode } from 'react';

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
import { Spinner } from '../shared/spinner';

export interface ButtonProps extends ActionProps, StyleProps<'Button'> {
  children?: ReactNode;
  onPress?: () => void;
  variant?: 'surface' | 'accent' | 'ghost';
  size?: ControlSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  /**
   * An action is under way. The label gives way to a spinner of the same
   * width, presses are ignored, and assistive technology hears it is busy.
   * The button stays focusable.
   */
  loading?: boolean;
  /**
   * State for assistive technology, beside `disabled` and `loading`: a
   * Dropdown sets `expanded` on its trigger while its menu is open.
   */
  accessibilityState?: AccessibilityState;
}

export function Button({
  children,
  onPress,
  variant = 'surface',
  size = 'md',
  leading,
  trailing,
  loading = false,
  disabled,
  accessibilityLabel,
  accessibilityState,
  ...props
}: ButtonProps) {
  const { theme, slot } = useComponent('Button', props);
  const c = theme.color;
  const label =
    accessibilityLabel ?? (typeof children === 'string' ? children : undefined);
  const height = controlHeight(theme, size);
  const padding = {
    sm: theme.spacing.spaceMd,
    md: theme.spacing.spaceLg,
    lg: theme.spacing.spaceXl,
  }[size];
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityHint={props.accessibilityHint}
      debugId={props.debugId}
      disabled={disabled}
      accessibilityState={
        loading ? { ...accessibilityState, busy: true } : accessibilityState
      }
      onPress={loading ? undefined : onPress}
      style={({ hovered, pressed, focusVisible }) =>
        slot('root', {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.spaceMd,
          height,
          minWidth: height,
          paddingHorizontal: padding,
          borderRadius:
            size === 'lg' ? theme.radius.radiusLg : theme.radius.radiusMd,
          borderWidth: theme.size.borderHairline,
          borderColor: hovered
            ? variant === 'accent'
              ? c.accentForeground
              : c.borderStrong
            : variant === 'accent'
              ? c.accentStrong
              : variant === 'ghost'
                ? 'transparent'
                : c.border,
          backgroundColor:
            variant === 'accent'
              ? c.accent
              : variant === 'ghost' && !hovered
                ? 'transparent'
                : c.surface,
          opacity: disabled
            ? theme.opacity.opacityDisabled
            : pressed
              ? theme.opacity.opacityPressed
              : 1,
          cursor: disabled || loading ? 'default' : 'pointer',
          ...ring(theme, focusVisible),
        })
      }
    >
      <View
        accessible={false}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.spaceMd,
          opacity: loading ? 0 : 1,
        }}
      >
        {leading}
        <Content
          style={slot('label', [
            textStyle(
              theme,
              'button',
              disabled
                ? c.textDisabled
                : variant === 'accent'
                  ? c.accentForeground
                  : variant === 'ghost'
                    ? c.textSecondary
                    : c.text,
            ),
            size === 'sm' && { fontSize: 10 },
            size === 'lg' && { fontSize: 12 },
          ])}
        >
          {children}
        </Content>
        {trailing}
      </View>
      {loading && (
        <View
          accessible={false}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Spinner
            color={variant === 'accent' ? c.accentForeground : c.textSecondary}
          />
        </View>
      )}
    </Pressable>
  );
}

import { Text, TextInput, View } from '@soundor/react';
import { useRef, useState } from 'react';
import type { UiNode } from 'soundor:ui';

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

export interface TextFieldProps extends ActionProps, StyleProps<'TextField'> {
  /** Shown above the field, and what assistive technology calls it. */
  label?: string;
  /** Controlled text; pair it with `onChange`. */
  value?: string;
  /** The initial text of an uncontrolled field. */
  defaultValue?: string;
  /** Shown, dimmed, while the field is empty. */
  placeholder?: string;
  /** After every edit, with the new text. */
  onChange?: (text: string) => void;
  /** On Enter, with the text. */
  onSubmit?: (text: string) => void;
  /** Help shown below the field; replaced by `error` while there is one. */
  description?: string;
  /** Marks the text as wrong and says why, below the field. */
  error?: string;
  size?: ControlSize;
  /** Width in pixels; the text scrolls inside it. */
  width?: number;
}

export function TextField({
  label,
  value,
  defaultValue = '',
  placeholder,
  onChange,
  onSubmit,
  description,
  error,
  size = 'md',
  width = 160,
  disabled = false,
  ...props
}: TextFieldProps) {
  const { theme, slot } = useComponent('TextField', props);
  const c = theme.color;
  const own = useControlValue(undefined, value, defaultValue);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<UiNode>(null);
  const invalid = error !== undefined && error !== '';
  const lineHeight = Math.ceil(theme.typography.body.fontSize * 1.3);
  const text = { ...textStyle(theme, 'body', c.text), lineHeight };
  const message = invalid ? error : description;
  const name = props.accessibilityLabel ?? label ?? 'Text';
  const hint = invalid ? error : (props.accessibilityHint ?? description);
  const style = slot('control', {
    height: controlHeight(theme, size),
    paddingHorizontal: theme.spacing.spaceMd,
    borderRadius: theme.radius.radiusSm,
    backgroundColor: c.surfaceInset,
    borderWidth: theme.size.borderHairline,
    borderColor: invalid
      ? c.danger
      : focused || hovered
        ? c.borderStrong
        : c.border,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    cursor: disabled ? 'default' : 'text',
    ...ring(theme, false),
  });
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
        style={style}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={() => {
          if (!disabled) input.current?.focus();
        }}
      >
        {disabled ? (
          // There is no disabled input: the text is shown, and can be neither
          // focused nor edited.
          <Text
            accessibilityLabel={name}
            accessibilityState={{ disabled: true }}
            numberOfLines={1}
            style={slot('input', [
              text,
              { flex: 1, minWidth: 0 },
              own.value === '' && { color: c.textMuted },
            ])}
          >
            {own.value === '' ? (placeholder ?? '') : own.value}
          </Text>
        ) : (
          <TextInput
            ref={input}
            value={own.value}
            placeholder={placeholder}
            accessibilityLabel={name}
            accessibilityHint={hint}
            style={slot('input', [
              text,
              {
                flex: 1,
                minWidth: 0,
                height: lineHeight,
                backgroundColor: 'transparent',
              },
            ])}
            onChangeText={(next) => {
              own.setOwn(next);
              onChange?.(next);
            }}
            onSubmitEditing={(next) => onSubmit?.(next)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </View>
      {message && (
        <Text
          accessible={false}
          style={slot('message', [
            textStyle(theme, 'caption', invalid ? c.danger : c.textMuted),
          ])}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

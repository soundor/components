import { Text, TextInput, View } from '@soundor/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { UiNode } from 'soundor:ui';

import { useValueField, type RangeProps } from '../../headless';
import { useMergedRef, withActions, type HostProps } from '../../internal/host';
import {
  controlHeight,
  ring,
  textStyle,
  useComponent,
  type ControlSize,
  type StyleProps,
} from '../../theme';

function splitNumber(formatted: string) {
  const found = /^(.*?)([+−-]?\d[\d.,]*)(.*)$/.exec(formatted);
  return {
    prefix: found?.[1] ?? '',
    number: found?.[2] ?? formatted,
    suffix: found?.[3] ?? '',
  };
}

export interface ValueFieldProps
  extends RangeProps, HostProps, StyleProps<'ValueField'> {
  size?: ControlSize;
  width?: number;
}

// A node's laid-out width, or nothing where there is no layout to ask.
function widthOf(node: UiNode | null) {
  try {
    return node?.getBoundingClientRect().width;
  } catch {
    return undefined;
  }
}

// The smallest a long value's text gets before it is clipped instead.
const minFontSize = 7;

export function ValueField({
  size = 'md',
  width = 72,
  ...props
}: ValueFieldProps) {
  const { theme, slot, fontsReady } = useComponent('ValueField', props);
  const [entry, setEntry] = useState<ReturnType<typeof splitNumber> | null>(
    null,
  );
  const [invalid, setInvalid] = useState(false);
  const input = useRef<UiNode>(null);
  const well = useRef<UiNode>(null);
  const editing = useRef(false);
  const restoreFocus = useRef(false);
  // Editing opened from the keyboard keeps the focus ring the field had; a
  // pointer's double-click shows none, as nothing else does for the pointer.
  const [keyboardEdit, setKeyboardEdit] = useState(false);
  const numberRange = useRef<[number, number]>([0, 0]);
  const label = useRef<UiNode>(null);
  // The caller's ref follows focus: the field, or its input while typing.
  const wellRef = useMergedRef(well, props.ref);
  const inputRef = useMergedRef(input, props.ref);
  const fitKey = useRef('');
  const base = theme.typography.value.fontSize;
  const [fontSize, setFontSize] = useState(base);
  // Until the first fit, in the final font, the text would show at full size
  // and clipped for a frame or two, so it waits.
  const [fitted, setFitted] = useState(false);
  const range = useValueField(props, { onDoubleClick: () => open() });
  const formatted = range.format(range.value);
  const shown = splitNumber(formatted);
  const isEditing = entry !== null && !range.disabled;
  function open(fromKeyboard = false) {
    if (range.disabled) return;
    setKeyboardEdit(fromKeyboard);
    editing.current = true;
    numberRange.current = [
      shown.prefix.length,
      shown.prefix.length + shown.number.length,
    ];
    setInvalid(false);
    setEntry(shown);
  }
  function finish(focus: boolean, clearError = true) {
    editing.current = false;
    restoreFocus.current = focus;
    setEntry(null);
    if (clearError) setInvalid(false);
  }
  function submit(text: string, focus: boolean) {
    if (!editing.current || !entry) return;
    const typed = text.trim();
    // A bare number keeps the prefix and unit it was shown with. Text that
    // has its own ("800 ms" where " s" followed the number, "R 20" where
    // "L " came before it) is read as typed.
    const candidates = /^[+−-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(typed)
      ? [entry.prefix + typed + entry.suffix]
      : [
          text,
          ...(entry.suffix && text.endsWith(entry.suffix)
            ? [text.slice(0, -entry.suffix.length)]
            : []),
        ];
    let value: number | null = null;
    for (const candidate of candidates) {
      value = range.parse(candidate);
      if (value !== null && Number.isFinite(value)) break;
    }
    if (value === null || !Number.isFinite(value)) {
      setInvalid(true);
      if (!focus) finish(false, false);
      return;
    }
    finish(focus);
    range.commit(value);
  }
  useLayoutEffect(() => {
    if (isEditing) {
      const field = input.current;
      field?.focus();
      // The number is selected, so typing replaces it; the prefix and unit
      // stay in the text, visible and editable, and a bare number keeps them.
      field?.setSelectionRange(...numberRange.current);
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      well.current?.focus();
    }
  }, [isEditing]);
  const c = theme.color;
  // A whole-pixel line, the same in the preview and the input, which is as
  // tall as one line: the field centres both alike, so nothing moves when
  // editing starts.
  const lineHeight = Math.ceil(theme.typography.value.fontSize * 1.2);
  const text = { ...textStyle(theme, 'value', c.text), lineHeight };
  const style = slot('control', {
    height: controlHeight(theme, size),
    paddingHorizontal: theme.spacing.spaceMd,
    borderRadius: theme.radius.radiusSm,
    backgroundColor: c.surfaceInset,
    borderWidth: theme.size.borderHairline,
    borderColor: invalid
      ? c.danger
      : range.hovered || isEditing
        ? c.borderStrong
        : c.border,
    flexDirection: 'row',
    alignItems: 'center',
    // From the start in both modes: typing then changes the text after the
    // caret only, so the prefix and the number's first digit stay put.
    justifyContent: 'flex-start',
    overflow: 'hidden',
    cursor: range.disabled ? 'default' : isEditing ? 'text' : 'ns-resize',
    ...ring(theme, range.focusVisible || (isEditing && keyboardEdit)),
  });
  // A value at rest is shown whole: if its text is wider than the field's
  // room, it is made smaller to fit, down to a floor. The text sits in a row
  // wide enough not to squeeze it, so its own width is its natural width at
  // the size it is shown, whatever the font, prefix and unit. A size from the
  // proportion is checked against the real width and stepped down while it
  // overflows; and checked again once fonts have loaded, as the first
  // measurement may be of a fallback font.
  const shownText = shown.prefix + shown.number + shown.suffix;
  const display = shownText.replaceAll(' ', '\u00a0');
  const room = width - 2 * (theme.spacing.spaceMd + theme.size.borderHairline);
  useEffect(() => {
    if (!fontsReady) return;
    const key = `${shownText}|${room}|${base}`;
    const fit = (estimate: boolean) => {
      const natural = widthOf(label.current);
      if (!natural || natural <= 0) {
        setFitted(true);
        return;
      }
      let next = estimate
        ? Math.floor(((fontSize * room) / natural) * 2) / 2
        : fontSize;
      next = Math.max(minFontSize, Math.min(base, next));
      if (next === fontSize && natural > room + 0.25 && next > minFontSize)
        next -= 0.5;
      if (next !== fontSize) setFontSize(next);
      else setFitted(true);
    };
    const frame = requestAnimationFrame(() => {
      const changed = fitKey.current !== key;
      fitKey.current = key;
      fit(changed);
    });
    const later = [120, 500].map((delay) =>
      setTimeout(() => {
        const natural = widthOf(label.current);
        fit(natural !== undefined && natural > room + 0.25);
      }, delay),
    );
    return () => {
      cancelAnimationFrame(frame);
      later.forEach(clearTimeout);
    };
  }, [shownText, room, base, fontsReady, fontSize]);
  return (
    <View
      style={slot('root', {
        width,
        alignSelf: 'flex-start',
        gap: theme.spacing.spaceXs,
        opacity: range.disabled ? theme.opacity.opacityDisabled : 1,
      })}
    >
      {range.label && (
        <Text
          accessible={false}
          style={slot('label', textStyle(theme, 'technical'))}
        >
          {range.label.toUpperCase()}
        </Text>
      )}
      {isEditing ? (
        <View style={style}>
          <TextInput
            ref={inputRef}
            defaultValue={entry.prefix + entry.number + entry.suffix}
            accessibilityLabel={
              props.accessibilityLabel ?? range.label ?? 'Value'
            }
            accessibilityHint={
              invalid ? 'Enter a valid value' : props.accessibilityHint
            }
            style={slot('input', [
              text,
              {
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
                height: lineHeight,
                backgroundColor: 'transparent',
              },
            ])}
            onChangeText={() => setInvalid(false)}
            onSubmitEditing={(value) => submit(value, true)}
            onBlur={(event) => {
              if (!range.disabled && event.currentTarget)
                submit(event.currentTarget.value, false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                finish(true);
                event.preventDefault();
              }
            }}
          />
        </View>
      ) : (
        <View
          {...range.handlers}
          {...withActions(range.handlers, props)}
          ref={wellRef}
          style={style}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !range.disabled) {
              open(true);
              event.preventDefault();
            } else range.handlers.onKeyDown?.(event);
          }}
        >
          {/* Not at spaces: the engine would wrap there and show only the first word. */}
          <View
            accessible={false}
            style={{ width: 4096, flexDirection: 'row', flexShrink: 0 }}
          >
            <Text
              accessible={false}
              ref={label}
              numberOfLines={1}
              style={[
                text,
                { flexShrink: 0, fontSize, opacity: fitted ? 1 : 0 },
              ]}
            >
              {display}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

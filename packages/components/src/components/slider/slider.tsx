import { Text, View } from '@soundor/react';

import { useSlider, type MixedRangeProps } from '../../headless';
import { withActions, type HostProps } from '../../internal/host';
import {
  accents,
  ring,
  textStyle,
  useComponent,
  type ControlColor,
  type ControlSize,
  type StyleProps,
} from '../../theme';

export interface SliderProps
  extends MixedRangeProps, HostProps, StyleProps<'Slider'> {
  size?: ControlSize;
  color?: ControlColor;
  width?: number;
  dragMode?: 'absolute' | 'relative';
}

const percent = (value: number): `${number}%` => `${value * 100}%`;

export function Slider({
  size = 'md',
  color = 'neutral',
  width,
  dragMode = 'absolute',
  ref,
  accessibilityActions,
  onAccessibilityAction,
  ...props
}: SliderProps) {
  const host = { accessibilityActions, onAccessibilityAction };
  const { theme, slot } = useComponent('Slider', props);
  const [thumb, height] = { sm: [10, 16], md: [12, 20], lg: [14, 26] }[size]!;
  const track = {
    sm: theme.size.trackSm,
    md: theme.size.trackMd,
    lg: theme.size.trackLg,
  }[size];
  // A press on the thumb, or a little either side, grabs it where it is.
  const r = useSlider(props, {
    dragMode,
    inset: thumb! / 2,
    grabRadius: thumb! / 2 + 4,
  });
  const accent = accents(theme, color);
  const c = theme.color;
  const lo = Math.min(r.normalized, r.origin);
  const hi = Math.max(r.normalized, r.origin);
  return (
    <View
      style={slot('root', {
        width,
        gap: theme.spacing.spaceSm,
        opacity: r.disabled ? theme.opacity.opacityDisabled : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: theme.spacing.spaceMd,
        }}
      >
        <Text
          accessible={false}
          style={slot('label', [
            textStyle(theme, 'controlLabel'),
            { fontSize: 11 },
          ])}
        >
          {r.label}
        </Text>
        <Text
          accessible={false}
          style={slot(
            'value',
            textStyle(theme, 'value', r.mixed ? c.textMuted : undefined),
          )}
        >
          {r.valueText}
        </Text>
      </View>
      <View
        {...r.handlers}
        {...withActions(r.handlers, host)}
        ref={ref}
        style={slot('control', {
          height,
          justifyContent: 'center',
          cursor: r.disabled ? 'default' : 'pointer',
          borderRadius: theme.radius.radiusSm,
          opacity: r.pressed ? theme.opacity.opacityPressed : 1,
          ...ring(theme, r.focusVisible),
        })}
      >
        <View
          style={slot('track', {
            position: 'absolute',
            left: 0,
            right: 0,
            height: track,
            borderRadius: track / 2,
            pointerEvents: 'none',
            backgroundColor: c.track,
          })}
        />
        <View
          style={{
            marginHorizontal: thumb! / 2,
            height,
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {!r.mixed && hi > lo && (
            <View
              style={{
                position: 'absolute',
                left: percent(lo),
                right: percent(1 - hi),
                marginLeft: lo === 0 ? -thumb! / 2 : undefined,
                marginRight: hi === 1 ? -thumb! / 2 : undefined,
                height: track,
                borderRadius: track / 2,
                backgroundColor: accent.fill,
              }}
            />
          )}
          <View
            style={slot('thumb', [
              {
                position: 'absolute',
                left: percent(r.mixed ? 0.5 : r.normalized),
                marginLeft: -thumb! / 2,
                width: thumb,
                height,
                borderRadius: theme.radius.radiusXs,
                backgroundColor: c.control,
                borderWidth: theme.size.borderHairline,
                borderColor: r.hovered ? c.trackFill : c.controlRim,
                alignItems: 'center',
                justifyContent: 'center',
              },
              r.mixed &&
                slot('mixed', {
                  backgroundColor: c.surfaceInset,
                  borderColor: c.border,
                }),
            ])}
          >
            {!r.mixed && (
              <View
                style={{
                  width: 2,
                  height: Math.round(height! * 0.45),
                  borderRadius: 1,
                  backgroundColor: accent.mark,
                }}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

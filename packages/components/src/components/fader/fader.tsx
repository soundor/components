import { Text, View } from '@soundor/react';

import { useFader, type MixedRangeProps } from '../../headless';
import { trueMinus } from '../../internal/format';
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

export interface FaderProps
  extends MixedRangeProps, HostProps, StyleProps<'Fader'> {
  size?: ControlSize;
  color?: ControlColor;
  length?: number;
  ticks?: readonly number[];
  formatTick?: (value: number) => string;
}

const defaultTick = (value: number) =>
  value > 0 ? `+${value}` : trueMinus(value);

export function Fader({
  size = 'md',
  color = 'neutral',
  length,
  ticks,
  formatTick = defaultTick,
  ref,
  accessibilityActions,
  onAccessibilityAction,
  ...props
}: FaderProps) {
  const host = { accessibilityActions, onAccessibilityAction };
  const { theme, slot } = useComponent('Fader', props);
  const [cap, height, preferredLength] = {
    sm: [22, 34, 120],
    md: [28, 44, 160],
    lg: [34, 52, 220],
  }[size] as [number, number, number];
  const track = {
    sm: theme.size.trackSm,
    md: theme.size.trackMd,
    lg: theme.size.trackLg,
  }[size];
  const total = Math.max(length ?? preferredLength, height + 1);
  const width = cap + 28;
  const at = (normalized: number) =>
    height / 2 + (1 - normalized) * (total - height);
  const r = useFader(props, { inset: height / 2 });
  const c = theme.color;
  const accent = accents(theme, color);
  const top = at(Math.max(r.normalized, r.origin));
  const bottom = at(Math.min(r.normalized, r.origin));
  return (
    <View
      style={slot('root', {
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.spacing.spaceSm,
        opacity: r.disabled ? theme.opacity.opacityDisabled : 1,
      })}
    >
      <Text
        accessible={false}
        style={slot(
          'value',
          textStyle(theme, 'value', r.mixed ? c.textMuted : undefined),
        )}
      >
        {r.valueText}
      </Text>
      <View
        {...r.handlers}
        {...withActions(r.handlers, host)}
        ref={ref}
        style={slot('control', {
          width,
          height: total,
          marginLeft: ticks?.length ? 22 : 0,
          borderRadius: theme.radius.radiusMd,
          cursor: r.disabled ? 'default' : 'ns-resize',
          opacity: r.pressed ? theme.opacity.opacityPressed : 1,
          ...ring(theme, r.focusVisible),
        })}
      >
        <View
          style={slot('track', {
            position: 'absolute',
            top: height / 2,
            bottom: height / 2,
            left: (width - track) / 2,
            width: track,
            borderRadius: track / 2,
            backgroundColor: c.track,
            pointerEvents: 'none',
          })}
        />
        {ticks
          ?.filter((tick) => tick >= r.min && tick <= r.max)
          .map((tick, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: at(r.normalize(tick)),
                height: 1,
                pointerEvents: 'none',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  width: 5,
                  height: 1,
                  backgroundColor: c.border,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  width: 5,
                  height: 1,
                  backgroundColor: c.border,
                }}
              />
              <Text
                accessible={false}
                style={[
                  textStyle(theme, 'value', c.textMuted),
                  {
                    position: 'absolute',
                    right: width + 4,
                    top: -5,
                    fontSize: 8,
                  },
                ]}
              >
                {formatTick(tick)}
              </Text>
            </View>
          ))}
        {!r.mixed && (
          <View
            style={{
              position: 'absolute',
              top,
              height: bottom - top,
              left: (width - track) / 2,
              width: track,
              borderRadius: track / 2,
              backgroundColor: accent.fill,
              pointerEvents: 'none',
            }}
          />
        )}
        <View
          style={slot('thumb', [
            {
              position: 'absolute',
              top: at(r.mixed ? 0.5 : r.normalized) - height / 2,
              left: (width - cap) / 2,
              width: cap,
              height,
              backgroundColor: c.control,
              borderWidth: theme.size.borderHairline,
              borderColor: r.hovered ? c.trackFill : c.controlRim,
              borderRadius: theme.radius.radiusSm,
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.spaceXs,
              pointerEvents: 'none',
            },
            r.mixed &&
              slot('mixed', {
                backgroundColor: c.surfaceInset,
                borderColor: c.border,
              }),
          ])}
        >
          {!r.mixed &&
            [1, 2, 1].map((line, index) => (
              <View
                key={index}
                style={{
                  width: cap - 8,
                  height: line,
                  borderRadius: 1,
                  opacity: line === 1 ? 0.35 : 1,
                  backgroundColor: accent.mark,
                }}
              />
            ))}
        </View>
      </View>
      {r.label && (
        <Text
          accessible={false}
          style={slot('label', [
            textStyle(theme, 'controlLabel'),
            { fontSize: 11 },
          ])}
        >
          {r.label}
        </Text>
      )}
    </View>
  );
}

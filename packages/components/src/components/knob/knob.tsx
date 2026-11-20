import { Text, View } from '@soundor/react';
import { Circle, Line, Path, Svg } from '@soundor/react/svg';

import { useKnob, type RangeProps } from '../../headless';
import {
  accents,
  ring,
  textStyle,
  useComponent,
  type ControlColor,
  type ControlSize,
  type StyleProps,
} from '../../theme';

function point(c: number, radius: number, angle: number) {
  return { x: c + radius * Math.cos(angle), y: c + radius * Math.sin(angle) };
}

function arc(c: number, radius: number, from: number, to: number) {
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  const start = point(c, radius, a);
  const end = point(c, radius, b);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${b - a > Math.PI ? 1 : 0} 1 ${end.x} ${end.y}`;
}

export interface KnobProps extends RangeProps, StyleProps<'Knob'> {
  size?: ControlSize;
  color?: ControlColor;
  showLabel?: boolean;
  showValue?: boolean;
  sweep?: number;
  resetOnHome?: boolean;
  wheelStep?: number;
}

export function Knob({
  size = 'md',
  color = 'neutral',
  showLabel = true,
  showValue = true,
  sweep = 270,
  resetOnHome,
  wheelStep,
  ...props
}: KnobProps) {
  const { theme, slot } = useComponent('Knob', props);
  const r = useKnob(props, { resetOnHome, wheelStep });
  const c = theme.color;
  const d = {
    sm: theme.size.knobSm,
    md: theme.size.knobMd,
    lg: theme.size.knobLg,
  }[size];
  const middle = d / 2;
  const extent = (Math.min(359.99, Math.max(1, sweep)) * Math.PI) / 180;
  const start = Math.PI * 1.5 - extent / 2;
  const angle = start + extent * r.normalized;
  const from = start + extent * r.origin;
  const radius = (d * 36) / 84;
  const body = (d * 29) / 84;
  const a = point(middle, (d * 17) / 84, angle);
  const b = point(middle, (d * 23) / 84, angle);
  const stroke = theme.size.arcWidth * (size === 'sm' ? 5 / 6 : 1);
  const accent = accents(theme, color);
  return (
    <View
      style={slot('root', {
        alignItems: 'center',
        opacity: r.disabled ? theme.opacity.opacityDisabled : 1,
      })}
    >
      <Svg
        {...r.handlers}
        width={d}
        height={d}
        viewBox={[0, 0, d, d]}
        style={slot('control', {
          borderRadius: middle,
          cursor: r.disabled ? 'default' : 'ns-resize',
          opacity: r.pressed ? theme.opacity.opacityPressed : 1,
          ...ring(theme, r.focusVisible),
        })}
      >
        <Path
          d={arc(middle, radius, start, start + extent)}
          fill="none"
          stroke={r.hovered ? c.border : c.track}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {from !== angle && (
          <Path
            d={arc(middle, radius, from, angle)}
            fill="none"
            stroke={accent.fill}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )}
        <Circle
          cx={middle}
          cy={middle}
          r={body - theme.size.borderHairline / 2}
          fill={c.control}
          stroke={c.controlRim}
          strokeWidth={theme.size.borderHairline}
        />
        <Line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={accent.mark}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </Svg>
      {showLabel && r.label && (
        <Text
          accessible={false}
          style={slot('label', [
            textStyle(theme, 'controlLabel'),
            { marginTop: theme.spacing.spaceSm },
            size === 'sm' && { fontSize: 11 },
          ])}
        >
          {r.label}
        </Text>
      )}
      {showValue && (
        <Text
          accessible={false}
          style={slot('value', [
            textStyle(theme, 'value'),
            {
              marginTop:
                showLabel && r.label
                  ? theme.spacing.spaceXs
                  : theme.spacing.spaceSm,
            },
          ])}
        >
          {r.format(r.value)}
        </Text>
      )}
    </View>
  );
}

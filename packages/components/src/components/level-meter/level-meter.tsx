import { Pressable, Text, View } from '@soundor/react';
import { useLayoutEffect, useRef, useState } from 'react';

import { formatters, trueMinus } from '../../internal/format';
import { clamp, createScale } from '../../internal/scale';
import {
  ring,
  textStyle,
  useComponent,
  type ControlSize,
  type StyleProps,
} from '../../theme';

export interface LevelMeterProps extends StyleProps<'LevelMeter'> {
  value: number | undefined | readonly (number | undefined)[];
  label?: string;
  min?: number;
  max?: number;
  warningAt?: number;
  clipAt?: number;
  /** Fall speed in dB per second. Zero follows input without decay. */
  fallRate?: number;
  /** Peak hold in seconds. */
  peakHold?: number;
  ticks?: readonly number[];
  length?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: ControlSize;
}

interface MeterState {
  level: number;
  peak: number;
  holdUntil: number;
  time: number;
}

function meterFrame(
  previous: MeterState,
  target: number,
  time: number,
  fallRate: number,
  hold: number,
): MeterState {
  const level =
    fallRate <= 0
      ? target
      : Math.max(
          target,
          previous.level -
            (Math.max(0, time - previous.time) * fallRate) / 1000,
        );
  if (target >= previous.peak)
    return { level, peak: level, holdUntil: time + hold * 1000, time };
  const decay = Math.max(0, time - Math.max(previous.time, previous.holdUntil));
  const peak =
    time < previous.holdUntil
      ? previous.peak
      : fallRate <= 0
        ? level
        : Math.max(level, previous.peak - (decay * fallRate) / 1000);
  return { level, peak, holdUntil: previous.holdUntil, time };
}

interface ChannelProps {
  value?: number;
  label: string;
  min: number;
  max: number;
  warningAt: number;
  clipAt: number;
  fallRate: number;
  peakHold: number;
  length: number;
  thickness: number;
  vertical: boolean;
  styles: StyleProps<'LevelMeter'>;
}

function Channel({
  value,
  label,
  min,
  max,
  warningAt,
  clipAt,
  fallRate,
  peakHold,
  length,
  thickness,
  vertical,
  styles,
}: ChannelProps) {
  const { theme, slot } = useComponent('LevelMeter', styles);
  const target = clamp(
    value === undefined || Number.isNaN(value) ? min : value,
    min,
    max,
  );
  const overload = value !== undefined && value >= clipAt;
  const [shown, setShown] = useState({ level: target, peak: target });
  const [clipped, setClipped] = useState(overload);
  const latestClip = useRef(overload);
  const state = useRef<MeterState | null>(null);
  useLayoutEffect(() => {
    if (overload && !latestClip.current) setClipped(true);
    latestClip.current = overload;
  }, [overload]);
  useLayoutEffect(() => {
    let frame: number | undefined;
    function tick(time: number) {
      const previous = state.current ?? {
        level: target,
        peak: target,
        time,
        holdUntil: time + peakHold * 1000,
      };
      const next = meterFrame(previous, target, time, fallRate, peakHold);
      state.current = next;
      setShown((current) =>
        current.level === next.level && current.peak === next.peak
          ? current
          : next,
      );
      if (next.level !== target || next.peak !== target)
        frame = requestAnimationFrame(tick);
    }
    tick(performance.now());
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [target, fallRate, peakHold]);

  const c = theme.color;
  const n = createScale([min, max]);
  const fraction = (v: number) => clamp(n.map(v));
  const start = (v: number): `${number}%` => `${100 * v}%`;
  const safe = fraction(warningAt);
  const warning = Math.max(safe, fraction(clipAt));
  const level = fraction(shown.level);
  const peak = fraction(shown.peak);
  // Whole pixels, so neighbouring segments meet without a seam.
  const px = (v: number) => Math.round(v * length);
  const filled = px(level);
  // The empty part is a segment of its own rather than the track's
  // background: under the fill, the dark would show through the softened
  // edge of each rounded end.
  const segments = [
    [0, Math.min(filled, px(safe)), c.displayPositive],
    [px(safe), Math.min(filled, px(warning)), c.displayWarning],
    [px(warning), filled, c.displayDanger],
    [filled, length, c.display],
  ] as const;
  return (
    <View
      style={slot('channel', {
        flexDirection: vertical ? 'column' : 'row-reverse',
        alignItems: 'center',
        gap: theme.spacing.spaceXxs,
      })}
    >
      <Pressable
        accessibilityLabel={`Reset ${label} clip indicator`}
        accessibilityState={{ checked: clipped }}
        accessibilityRole="togglebutton"
        onPress={() => setClipped(false)}
        style={({ focusVisible }) =>
          slot('indicator', {
            width: vertical ? thickness : 4,
            height: vertical ? 4 : thickness,
            borderRadius: 1,
            backgroundColor: clipped ? c.displayDanger : c.displayGrid,
            ...ring(theme, focusVisible),
          })
        }
      />
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{
          min,
          max,
          now: target,
          text: formatters.decibels(target),
        }}
        style={slot('track', {
          width: vertical ? thickness : length,
          height: vertical ? length : thickness,
          borderRadius: theme.radius.radiusXs,
          overflow: 'hidden',
        })}
      >
        {segments.map(([segmentFrom, segmentTo, color], index) => {
          if (segmentTo - segmentFrom <= 0) return null;
          // The outermost segments run a pixel past the track's ends.
          // Snapped to whole device pixels, a segment's edge can fall short
          // of the rounded clip, which sits where layout put it, and leave a
          // flat sliver at fractional scales. The clip trims what goes past.
          const from = segmentFrom === 0 ? -1 : segmentFrom;
          const to = segmentTo === length ? length + 1 : segmentTo;
          const size = to - from;
          return (
            <View
              key={index}
              style={[
                { position: 'absolute', backgroundColor: color },
                vertical
                  ? {
                      bottom: from,
                      height: size,
                      left: 0,
                      right: 0,
                    }
                  : {
                      left: from,
                      width: size,
                      top: 0,
                      bottom: 0,
                    },
              ]}
            />
          );
        })}
        {peak > 0 && (
          <View
            style={[
              { position: 'absolute', backgroundColor: c.displayText },
              vertical
                ? {
                    bottom: start(peak),
                    height: 1,
                    left: 0,
                    right: 0,
                    marginBottom: -1,
                  }
                : {
                    left: start(peak),
                    width: 1,
                    top: 0,
                    bottom: 0,
                    marginLeft: -1,
                  },
            ]}
          />
        )}
      </View>
    </View>
  );
}

export function LevelMeter({
  value,
  label = 'Level',
  min = -60,
  max = 6,
  warningAt = -6,
  clipAt = 0,
  fallRate = 24,
  peakHold = 1,
  ticks,
  length = 140,
  orientation = 'vertical',
  size = 'md',
  ...styles
}: LevelMeterProps) {
  const { theme, slot } = useComponent('LevelMeter', styles);
  const levels =
    typeof value === 'number' || value === undefined ? [value] : value;
  const vertical = orientation === 'vertical';
  const thickness = { sm: 4, md: 6, lg: 10 }[size];
  const scale = createScale([min, max], [0, length]);
  return (
    <View
      style={slot('root', {
        flexDirection: vertical ? 'row' : 'column',
        alignSelf: 'flex-start',
        gap: theme.spacing.spaceXxs,
      })}
    >
      {levels.map((level, index) => (
        <Channel
          key={index}
          value={level}
          label={levels.length === 1 ? label : `${label}, channel ${index + 1}`}
          min={min}
          max={max}
          warningAt={warningAt}
          clipAt={clipAt}
          fallRate={fallRate}
          peakHold={peakHold}
          length={length}
          thickness={thickness}
          vertical={vertical}
          styles={styles}
        />
      ))}
      {ticks && (
        <View
          style={
            vertical
              ? { width: 20, height: length, marginTop: 6 }
              : { width: length, height: 12 }
          }
        >
          {ticks
            .filter((tick) => tick >= min && tick <= max)
            .map((tick, index) => (
              <Text
                key={index}
                accessible={false}
                style={slot('label', [
                  textStyle(theme, 'value', theme.color.textMuted),
                  { position: 'absolute', fontSize: 8 },
                  vertical
                    ? { right: 2, bottom: scale.map(tick) - 5 }
                    : {
                        left: clamp(
                          scale.map(tick) - 5,
                          0,
                          Math.max(0, length - 14),
                        ),
                        top: 0,
                      },
                ])}
              >
                {tick > 0 ? `+${tick}` : trueMinus(tick)}
              </Text>
            ))}
        </View>
      )}
    </View>
  );
}

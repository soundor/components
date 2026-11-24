import { Text, View } from '@soundor/react';
import { useLayoutEffect, useMemo, useState } from 'react';

import {
  createCoordinates,
  viewport,
  type Coordinates,
} from '../../chart/geometry';
import {
  envelopeStages,
  useEnvelopeEditor,
  type EnvelopeHandle,
  type EnvelopeOptions,
} from '../../internal/envelope-interaction';
import {
  accents,
  ring,
  textStyle,
  useComponent,
  type AccentColor,
  type StyleProps,
  type Theme,
} from '../../theme';
import { Plot, usePlotCoordinates } from '../plot';
import { colorFor, fillBox } from '../shared/display';

export interface EnvelopeEditorProps
  extends EnvelopeOptions, StyleProps<'EnvelopeEditor'> {
  /** The display's size; it follows a `styles.plot` width or height of its own. */
  width?: number;
  height?: number;
  /** Shown at the top of the display. */
  title?: string;
  /** The curve's and the handles' colour. */
  color?: AccentColor;
  /** A faint fill under the curve: on by default. */
  fill?: boolean;
  /** Lines at each stage's end, and at the levels: on by default. */
  grid?: boolean;
  /** The levels along the left: on by default. */
  axisLabels?: boolean;
  /** Each stage's value under the display: on by default. */
  showValues?: boolean;
  /** What assistive technology calls the display: the title, or "Envelope". */
  accessibilityLabel?: string;
  debugId?: string;
}

/** A handle's halo and dot, plus the pixels around them a press reaches. */
const halo = 13;
const dot = 8;
const letters = { attack: 'A', decay: 'D', sustain: 'S', release: 'R' };
const levels = [0, 0.5, 1];
const unit = [0, 1] as const;
const blank = () => '';

function samePlace(a: Coordinates | null, b: Coordinates) {
  if (!a) return false;
  const keys = ['left', 'top', 'width', 'height'] as const;
  return (
    keys.every((key) => a.rect[key] === b.rect[key]) &&
    keys.every((key) => a.inner[key] === b.inner[key]) &&
    a.x.map(1) - a.x.map(0) === b.x.map(1) - b.x.map(0)
  );
}

/**
 * Tells the editor where the plot maps its values, once it has laid out and
 * whenever that changes: on a resize, not on every frame.
 */
function Place({ report }: { report: (space: Coordinates) => void }) {
  const space = usePlotCoordinates();
  useLayoutEffect(() => report(space));
  return null;
}

function Handle({
  handle,
  color,
  disabled,
  theme,
  slot,
}: {
  handle: EnvelopeHandle;
  color: string;
  disabled: boolean;
  theme: Theme;
  slot: ReturnType<typeof useComponent<'EnvelopeEditor'>>['slot'];
}) {
  const { attach, handlers, x, y, focusVisible, pressed, stage } = handle;
  const active = handle.hovered || pressed || focusVisible;
  return (
    <View
      {...handlers}
      ref={attach}
      style={slot('handle', {
        position: 'absolute',
        left: x - halo,
        top: y - halo,
        width: halo * 2,
        height: halo * 2,
        borderRadius: halo,
        alignItems: 'center',
        justifyContent: 'center',
        // The layer under the handles takes the pointer and finds the
        // nearest; the handles take focus and keys.
        pointerEvents: 'none',
        opacity: disabled ? theme.opacity.opacityDisabled : 1,
        ...ring(theme, focusVisible, 1),
      })}
    >
      <View
        accessible={false}
        style={{
          ...fillBox,
          borderRadius: halo,
          backgroundColor: color,
          opacity: pressed ? 0.28 : active ? 0.2 : 0.08,
        }}
      />
      <View
        accessible={false}
        style={{
          width: dot * 2,
          height: dot * 2,
          borderRadius: dot,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          accessible={false}
          style={{
            fontFamily: theme.font.mono,
            fontSize: 9,
            fontWeight: 'bold',
            color: theme.color.display,
          }}
        >
          {letters[stage]}
        </Text>
      </View>
    </View>
  );
}

/**
 * An ADSR envelope to edit by its handles: attack, decay, sustain and
 * release, each bound to a parameter or held in state. It draws on a Plot,
 * and only draws: it computes no samples and runs no envelope.
 */
export function EnvelopeEditor({
  width = 440,
  height = 200,
  title,
  color = 'lavender',
  fill = true,
  grid = true,
  axisLabels = true,
  showValues = true,
  accessibilityLabel,
  debugId,
  style,
  styles,
  ...options
}: EnvelopeEditorProps) {
  const { theme, slot } = useComponent('EnvelopeEditor', { style, styles });
  const c = theme.color;
  const tint = colorFor(theme, color);
  // Until the plot has said where it maps values: its layout from its props.
  const estimate = useMemo(
    () =>
      createCoordinates(
        viewport(width, height, {
          left: Math.min(56, width * 0.24),
          right: 14,
          top: title ? Math.max(28, height * 0.2) : 10,
          bottom: 20,
        }),
        { domain: [0, 3 + (options.sustainWidth ?? 0.5)] },
        { domain: [0, 1] },
        halo + 1,
      ),
    [width, height, title, options.sustainWidth],
  );
  const [space, setSpace] = useState<Coordinates | null>(null);
  const report = (next: Coordinates) => {
    if (!samePlace(space, next)) setSpace(next);
  };
  const editor = useEnvelopeEditor(options, space ?? estimate);
  const { geometry, handles } = editor;
  const sustain = handles[2]!;
  // Silence before the note and after the release: level at zero out to
  // the plot's edges, past the handles' safe zone, fainter than the curve.
  const silence = useMemo(() => {
    const [first, last] = [geometry.points[0]!, geometry.points.at(-1)!];
    const span = geometry.domain[1] - geometry.domain[0];
    return [
      [
        [first[0] - span, first[1]],
        [first[0], first[1]],
      ],
      [
        [last[0], last[1]],
        [last[0] + span, last[1]],
      ],
    ] as const;
  }, [geometry]);
  const Curve = fill ? Plot.Area : Plot.Line;
  const active =
    handles.find((handle) => handle.pressed) ??
    handles.find((handle) => handle.focusVisible) ??
    handles.find((handle) => handle.hovered);
  return (
    <View
      debugId={debugId}
      style={slot('root', {
        alignSelf: 'flex-start',
        gap: theme.spacing.spaceSm,
      })}
    >
      <Plot
        width={width}
        height={height}
        title={title}
        accessibilityLabel={accessibilityLabel ?? title ?? 'Envelope'}
        style={slot('plot')}
        safeZone={halo + 1}
      >
        <Plot.XAxis
          domain={geometry.domain}
          // Each stage's end, for the eye: the plot's units are not seconds.
          ticks={
            grid
              ? [handles[0]!, handles[1]!, sustain].map(
                  (handle) => geometry.handles[handle.stage][0],
                )
              : []
          }
          format={blank}
        />
        <Plot.YAxis
          domain={unit}
          ticks={grid || axisLabels ? levels : []}
          format={axisLabels ? editor.levelAt : blank}
        />
        <Plot.Grid />
        {silence.map((points, index) => (
          <Plot.Line
            key={index}
            points={points}
            color={tint}
            strokeWidth={1.5}
            opacity={0.35}
            hideInReadout
          />
        ))}
        <Curve
          points={geometry.points}
          color={tint}
          baseline={0}
          strokeWidth={2}
          hideInReadout
        />
        <Place report={report} />
        <View
          {...editor.layerHandlers}
          style={{
            ...fillBox,
            cursor: editor.disabled
              ? 'default'
              : handles.some((handle) => handle.hovered || handle.pressed)
                ? 'move'
                : 'default',
          }}
        />
        {handles.map((handle) => (
          <Handle
            key={handle.stage}
            handle={handle}
            color={tint}
            disabled={editor.disabled}
            theme={theme}
            slot={slot}
          />
        ))}
      </Plot>
      {showValues && (
        <View
          accessible={false}
          style={slot('values', {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.spaceXs,
            gap: theme.spacing.spaceLg,
          })}
        >
          {envelopeStages.map((stage, index) => {
            const lit = active?.stage === stage;
            return (
              <View key={stage} style={{ gap: theme.spacing.spaceXxs }}>
                <Text
                  accessible={false}
                  style={slot(
                    'label',
                    textStyle(
                      theme,
                      'technical',
                      lit ? accents(theme, color).edge : undefined,
                    ),
                  )}
                >
                  {handles[index]!.label.toUpperCase()}
                </Text>
                <Text
                  accessible={false}
                  style={slot(
                    'value',
                    textStyle(theme, 'value', lit ? c.text : undefined),
                  )}
                >
                  {editor.text[stage]}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

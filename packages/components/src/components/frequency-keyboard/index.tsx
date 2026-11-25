import { Canvas, View } from '@soundor/react';
import { useMemo } from 'react';

import { createScale, type Domain } from '../../internal/scale';
import { useComponent, type StyleProps } from '../../theme';
import { usePlotSpace } from '../plot/controller';
import {
  fillBox,
  numericFont,
  useCanvasBox,
  useDrawing,
} from '../shared/display';
import { keyboardNotes } from './notes';

interface KeyboardProps extends StyleProps<'FrequencyKeyboard'> {
  height?: number;
  tuning?: number;
  showOctaves?: boolean;
  showNotes?: boolean;
  /** Equal-tempered note numbers, where A4 is 69. */
  highlightedNotes?: readonly number[];
  highlightedRange?: Domain;
  accessibilityLabel?: string;
}

export interface FrequencyKeyboardProps extends KeyboardProps {
  width: number;
  frequencyRange?: Domain;
}

export interface PlotFrequencyKeyboardProps extends KeyboardProps {
  xAxis?: string;
}

/** Standalone keyboard, logarithmically spread between the given frequencies. */
export function FrequencyKeyboard({
  width,
  frequencyRange = [20, 20000],
  ...props
}: FrequencyKeyboardProps) {
  return <Keyboard {...props} width={width} frequencyRange={frequencyRange} />;
}

/** An aligned, non-interactive strip at the bottom of a Plot's frame. */
export function PlotFrequencyKeyboard({
  xAxis,
  ...props
}: PlotFrequencyKeyboardProps) {
  const axis = usePlotSpace('Plot.FrequencyKeyboard').resolve({ xAxis });
  if (!axis) return null;
  const { rect, x } = axis.coordinates;
  const height = props.height ?? 30;
  return (
    <View
      accessible={false}
      style={{
        pointerEvents: 'box-none',
        position: 'absolute',
        left: rect.left,
        top: rect.top + rect.height - height,
        width: rect.width,
        height,
      }}
    >
      <Keyboard
        {...props}
        width={rect.width}
        frequencyRange={axis.x.domain}
        map={(hz) => x.map(hz) - rect.left}
      />
    </View>
  );
}

function Keyboard({
  width,
  height = 30,
  frequencyRange,
  tuning = 440,
  showOctaves = true,
  showNotes = false,
  highlightedNotes,
  highlightedRange,
  accessibilityLabel = 'Musical pitch keyboard',
  map,
  ...styles
}: FrequencyKeyboardProps & {
  frequencyRange: Domain;
  map?: (hz: number) => number;
}) {
  const { theme, fontsReady, slot } = useComponent('FrequencyKeyboard', styles);
  const box = useCanvasBox(width, height);
  const { node } = box;
  const [low, high] = frequencyRange;
  const notes = useMemo(
    () => keyboardNotes([low, high], tuning),
    [low, high, tuning],
  );
  useDrawing(box, (ctx) => {
    const scale = map ?? createScale([low, high], [0, box.width], 'log').map;
    ctx.fillStyle = theme.color.display;
    ctx.fillRect(0, 0, box.width, box.height);
    ctx.font = numericFont(
      theme,
      fontsReady,
      theme.typography.caption.fontSize,
    );
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    let lastLabelEnd = -Infinity;
    for (const black of [false, true]) {
      for (const note of notes) {
        if (note.black !== black) continue;
        // A white key extends below a neighbouring black key's lower edge.
        const left = Math.max(
          0,
          scale(
            black
              ? note.low
              : note.low /
                  (note.name === 'C' || note.name === 'F'
                    ? 1
                    : 2 ** (0.43 / 12)),
          ),
        );
        const right = Math.min(
          box.width,
          scale(
            black
              ? note.high
              : note.high *
                  (note.name === 'E' || note.name === 'B'
                    ? 1
                    : 2 ** (0.43 / 12)),
          ),
        );
        if (!(right > left)) continue;
        const keyHeight = black ? box.height * 0.58 : box.height;
        const highlighted =
          highlightedNotes?.includes(note.note) ||
          (highlightedRange &&
            note.hz >= highlightedRange[0] &&
            note.hz <= highlightedRange[1]);
        ctx.fillStyle = highlighted
          ? theme.color.lime
          : black
            ? theme.color.displayAxis
            : theme.color.displayText;
        const gap = Math.min(1 / box.canvas.scaleX, (right - left) / 3);
        ctx.fillRect(left, 0, right - left - gap, keyHeight);
        const name =
          note.name === 'C' && showOctaves
            ? `${note.name}${note.octave}`
            : showNotes
              ? note.name
              : '';
        if (!name || black) continue;
        const at = scale(note.hz);
        const half = ctx.measureText(name).width / 2;
        if (
          at - half < Math.max(0, lastLabelEnd + theme.spacing.spaceXs) ||
          at + half > box.width
        )
          continue;
        ctx.fillStyle = theme.color.display;
        ctx.fillText(name, at, box.height * 0.8);
        lastLabelEnd = at + half;
      }
    }
  });
  return (
    <View
      style={slot('root', {
        width,
        height,
        overflow: 'hidden',
        pointerEvents: 'none',
      })}
    >
      <Canvas
        ref={node}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={slot('canvas', fillBox)}
      />
    </View>
  );
}

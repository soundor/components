import { Canvas, Text, View } from '@soundor/react';
import { useMemo } from 'react';

import {
  clipToViewport,
  drawGrid,
  drawHandle,
  drawSelection,
} from '../../chart/drawing';
import { viewport } from '../../chart/geometry';
import { useXYPad, type RangeProps } from '../../headless';
import { formatters } from '../../internal/format';
import { withActions, type HostProps } from '../../internal/host';
import {
  ring,
  textStyle,
  useComponent,
  type AccentColor,
  type StyleProps,
} from '../../theme';
import { DisplayHeader } from '../shared/display';
import { useCanvasBox } from '../shared/display';
import { useDrawing } from '../shared/display';
import { fillBox } from '../shared/display';

export interface XYPadProps extends HostProps, StyleProps<'XYPad'> {
  x: RangeProps;
  y: RangeProps;
  width?: number;
  height?: number;
  color?: AccentColor;
  divisions?: readonly [number, number];
  title?: string;
  note?: string;
  label?: string;
  showValues?: boolean;
  debugId?: string;
}

const defaultDivisions = [8, 4] as const;
const fractions = (length: number, divisions: number) => {
  const count = Math.max(1, Math.min(100, Math.floor(divisions)));
  return Array.from(
    { length: count - 1 },
    (_, index) => (length * (index + 1)) / count,
  );
};

export function XYPad({
  x,
  y,
  width = 280,
  height = 180,
  color = 'lavender',
  divisions = defaultDivisions,
  title,
  note,
  label,
  showValues = true,
  debugId,
  ref,
  accessibilityActions,
  onAccessibilityAction,
  ...styles
}: XYPadProps) {
  const { theme, slot } = useComponent('XYPad', styles);
  const box = useCanvasBox(width, height);
  const { node, width: logicalWidth, height: logicalHeight } = box;
  const inset = Math.max(
    0,
    Math.min(23, (logicalWidth - 1) / 2, (logicalHeight - 1) / 2),
  );
  // Room for the title above the handle's halo, as for the readout below.
  const top = title || note ? Math.min(inset + 24, logicalHeight / 2) : inset;
  // Room for the readout under the handle's halo, not just under the handle.
  const bottom = showValues ? Math.min(inset + 24, logicalHeight / 2) : inset;
  const outer = viewport(logicalWidth, logicalHeight);
  const inner = viewport(logicalWidth, logicalHeight, {
    left: inset,
    right: inset,
    top,
    bottom,
  });
  const controls = useXYPad(
    {
      ...x,
      defaultValue: x.defaultValue ?? ((x.min ?? 0) + (x.max ?? 1)) / 2,
      format: x.format ?? (x.parameter ? undefined : formatters.percent),
    },
    {
      ...y,
      defaultValue: y.defaultValue ?? ((y.min ?? 0) + (y.max ?? 1)) / 2,
      format: y.format ?? (y.parameter ? undefined : formatters.percent),
    },
    {
      inset,
      insetTop: top,
      travel: [inner.width, inner.height],
      label: label ?? title,
    },
  );
  const c = theme.color;
  const viewX = inset + controls.x.normalized * inner.width;
  const viewY = top + (1 - controls.y.normalized) * inner.height;
  const xs = useMemo(
    () => fractions(logicalWidth, divisions[0]),
    [logicalWidth, divisions],
  );
  const ys = useMemo(
    () => fractions(logicalHeight, divisions[1]),
    [logicalHeight, divisions],
  );
  useDrawing(box, (ctx) => {
    clipToViewport(ctx, outer, () => {
      drawGrid(ctx, outer, xs, ys, c.displayGrid);
      drawSelection(ctx, outer, viewX, viewY, c[color], undefined, 0.22);
      drawHandle(ctx, viewX, viewY, 13, c[color], controls.focusVisible, 21);
    });
  });
  return (
    <View
      {...controls.handlers}
      {...withActions(controls.handlers, {
        accessibilityActions,
        onAccessibilityAction,
      })}
      ref={ref}
      debugId={debugId}
      style={slot('root', {
        width,
        height,
        backgroundColor: c.display,
        borderRadius: theme.radius.radiusXl,
        overflow: 'hidden',
        cursor: controls.disabled ? 'default' : 'crosshair',
        opacity: controls.disabled ? theme.opacity.opacityDisabled : 1,
        ...ring(theme, controls.focusVisible),
      })}
    >
      <Canvas
        ref={node}
        style={slot('canvas', { ...fillBox, pointerEvents: 'none' })}
      />
      <DisplayHeader
        title={title}
        note={note}
        theme={theme}
        titleStyle={slot('title')}
        noteStyle={slot('note')}
      />
      {showValues && (
        <Text
          accessible={false}
          style={slot('value', [
            textStyle(theme, 'value', c.displayText),
            {
              position: 'absolute',
              left: 18,
              bottom: 12,
              fontSize: 10,
              pointerEvents: 'none',
            },
          ])}
        >
          {controls.x.format(controls.x.value)} ·{' '}
          {controls.y.format(controls.y.value)}
        </Text>
      )}
    </View>
  );
}

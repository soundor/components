import { Text, View, useCanvasSize, type StyleProp } from '@soundor/react';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { PointerEvent, UiNode } from 'soundor:ui';

import { type Axis, type Point } from '../../chart/geometry';
import { type PlotSeriesSource } from '../../chart/series';
import { textStyle, type Theme } from '../../theme';
import { Light } from './light';

export interface DisplayCaption {
  title?: string;
  note?: string;
  indicator?: boolean | string;
}

export function DisplayHeader({
  title,
  note,
  indicator,
  theme,
  titleStyle,
  noteStyle,
}: DisplayCaption & {
  theme: Theme;
  titleStyle?: StyleProp;
  noteStyle?: StyleProp;
}) {
  if (!title && !note && !indicator) return null;
  return (
    <View
      style={{
        position: 'absolute',
        left: 18,
        right: 18,
        top: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.spaceMd,
        }}
      >
        {indicator && (
          <Light
            color={typeof indicator === 'string' ? indicator : theme.color.lime}
          />
        )}
        {title && (
          <Text
            style={[
              textStyle(theme, 'section', theme.color.displayText),
              titleStyle,
            ]}
          >
            {title.toUpperCase()}
          </Text>
        )}
      </View>
      {note && (
        <Text
          style={[
            textStyle(theme, 'section', theme.color.displayMuted),
            { letterSpacing: 0.8 },
            noteStyle,
          ]}
        >
          {note.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

export function useCanvasBox(width: number, height: number) {
  const node = useRef<UiNode>(null);
  const canvas = useCanvasSize(node);
  return {
    node,
    canvas,
    width: canvas.width > 0 ? canvas.width / canvas.scaleX : width,
    height: canvas.height > 0 ? canvas.height / canvas.scaleY : height,
  };
}

export function useDrawing(
  box: ReturnType<typeof useCanvasBox>,
  draw: (ctx: CanvasRenderingContext2D) => void,
  source?: PlotSeriesSource,
) {
  const paint = useRef<(() => void) | null>(null);
  const frame = useRef<number | null>(null);
  const invalidate = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      paint.current?.();
    });
  }, []);
  useLayoutEffect(() => {
    paint.current = () => {
      const ctx = box.node.current?.getContext('2d');
      if (!ctx || !box.canvas.width || !box.canvas.height) return;
      ctx.setTransform(box.canvas.scaleX, 0, 0, box.canvas.scaleY, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      draw(ctx);
    };
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    paint.current();
  });
  useLayoutEffect(() => {
    const unsubscribe = source?.subscribe(invalidate);
    if (source) invalidate();
    return () => {
      unsubscribe?.();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [source, invalidate]);
  return invalidate;
}

export const fillBox = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;
export const fallbacks = {
  x: { domain: [0, 1] } as Axis,
  y: { domain: [0, 1] } as Axis,
};
export const voices = ['lavender', 'lime', 'coral'] as const;

export function colorFor(theme: Theme, color: string) {
  return color === 'lavender' || color === 'lime' || color === 'coral'
    ? theme.color[color]
    : color;
}

export function numericFont(
  theme: Theme,
  ready: boolean,
  size: number,
  bold = false,
) {
  const family = ready ? theme.font.mono : 'monospace';
  return `${bold ? 'bold ' : ''}${size}px ${family.includes(' ') ? `"${family}"` : family}`;
}

export function position(event: PointerEvent): Point {
  const box = event.currentTarget?.getBoundingClientRect();
  return [event.pageX - (box?.x ?? 0), event.pageY - (box?.y ?? 0)];
}

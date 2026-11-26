import { Portal, StyleSheet } from '@soundor/react';
import { Path, Svg } from '@soundor/react/svg';
import { useContext, useLayoutEffect } from 'react';

import { useComponent, type StyleProps } from '../../theme';
import { PopupPlacementContext } from './placement-context';

export interface PopupArrowProps extends StyleProps<'PopupArrow'> {
  debugId?: string;
}

/** A decorative pointer on the anchor-facing edge of a Popover or Tooltip. */
export function Arrow({ debugId, ...styles }: PopupArrowProps) {
  const popup = useContext(PopupPlacementContext);
  if (!popup)
    throw new Error('Arrow belongs inside Popover.Content or Tooltip.Content.');
  const { placement, surfaceStyle, arrowHost, registerArrow } = popup;
  const { slot } = useComponent('PopupArrow', styles);
  const style = StyleSheet.flatten(
    slot('root', {
      width: 12,
      height: 6,
      backgroundColor: surfaceStyle.backgroundColor,
      borderColor: surfaceStyle.borderColor,
    }),
  );
  const width = typeof style.width === 'number' ? Math.max(0, style.width) : 12;
  const height =
    typeof style.height === 'number' ? Math.max(0, style.height) : 6;
  const protrusion = width > 0 ? height : 0;
  useLayoutEffect(() => registerArrow(protrusion), [registerArrow, protrusion]);
  if (!placement || !protrusion) return null;

  const { x, y, side, anchorOffset } = placement;
  const vertical = side === 'top' || side === 'bottom';
  const extent = vertical ? placement.width : placement.height;
  const radius = surfaceStyle.borderRadius ?? 0;
  const tl = surfaceStyle.borderTopLeftRadius ?? radius;
  const tr = surfaceStyle.borderTopRightRadius ?? radius;
  const br = surfaceStyle.borderBottomRightRadius ?? radius;
  const bl = surfaceStyle.borderBottomLeftRadius ?? radius;
  // Match the surface's radius reduction if adjacent corners don't fit.
  const fit = (length: number, radii: number) =>
    radii > 0 ? length / radii : 1;
  const radiusScale = Math.min(
    1,
    fit(placement.width, tl + tr),
    fit(placement.width, bl + br),
    fit(placement.height, tl + bl),
    fit(placement.height, tr + br),
  );
  const horizontalBorder =
    surfaceStyle.borderHorizontalWidth ?? surfaceStyle.borderWidth ?? 0;
  const verticalBorder =
    surfaceStyle.borderVerticalWidth ?? surfaceStyle.borderWidth ?? 0;
  const edges = {
    top: [bl, br, surfaceStyle.borderBottomWidth ?? verticalBorder],
    bottom: [tl, tr, surfaceStyle.borderTopWidth ?? verticalBorder],
    left: [tr, br, surfaceStyle.borderRightWidth ?? horizontalBorder],
    right: [tl, bl, surfaceStyle.borderLeftWidth ?? horizontalBorder],
  } as const;
  const [startRadius, endRadius, surfaceBorder] = edges[side];
  const start = startRadius * radiusScale;
  const end = extent - endRadius * radiusScale;
  const base = Math.min(width, end - start);
  if (base <= 0) return null;
  const half = base / 2;
  const center = Math.min(end - half, Math.max(start + half, anchorOffset));
  const fill = style.backgroundColor ?? 'transparent';
  const stroke = style.borderColor ?? 'none';
  const line = Math.max(
    0,
    Math.min(style.borderWidth ?? surfaceBorder, half, height),
  );
  // Cover the surface border at the join; only the diagonal edges are stroked.
  const depth = height + Math.max(surfaceBorder, line);
  const forward = side === 'top' || side === 'left';
  const point = (cross: number, fromTip: number) => {
    const along = forward ? depth - fromTip : fromTip;
    return vertical ? `${cross} ${along}` : `${along} ${cross}`;
  };
  const a = point(line / 2, height + line / 2);
  const b = point(half, line / 2);
  const c = point(base - line / 2, height + line / 2);
  const svgWidth = vertical ? base : depth;
  const svgHeight = vertical ? depth : base;

  return (
    <Portal host={arrowHost}>
      <Svg
        accessible={false}
        debugId={debugId}
        width={svgWidth}
        height={svgHeight}
        viewBox={[0, 0, svgWidth, svgHeight]}
        style={{
          position: 'absolute',
          left: vertical
            ? x + center - half
            : forward
              ? x + placement.width + height - depth
              : x - height,
          top: !vertical
            ? y + center - half
            : forward
              ? y + placement.height + height - depth
              : y - height,
          pointerEvents: 'none',
        }}
      >
        <Path
          d={`M ${a} L ${b} L ${c} L ${point(base - line / 2, depth)} L ${point(line / 2, depth)} Z`}
          fill={fill}
        />
        {line > 0 && (
          <Path
            d={`M ${a} L ${b} L ${c}`}
            fill="none"
            stroke={stroke}
            strokeWidth={line}
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </Portal>
  );
}

import { View } from '@soundor/react';
import { Path, Svg } from '@soundor/react/svg';

import {
  useResizeGrip,
  type ResizeGripOptions,
} from '../../internal/resize-interaction';
import { ring, useComponent, type StyleProps } from '../../theme';

export interface ResizeGripProps
  extends ResizeGripOptions, StyleProps<'ResizeGrip'> {
  /** Side length of the handle, in logical pixels. Defaults to 18. */
  size?: number;
  /** Color of the diagonal strokes. Defaults to the theme's secondary text color. */
  color?: string;
}

/** Place at the editor root to resize from the bottom-right corner. */
export function ResizeGrip({
  size = 18,
  color,
  keyStep,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: ResizeGripProps) {
  const grip = useResizeGrip({
    keyStep,
    accessibilityLabel,
    accessibilityHint,
  });
  const { theme, slot } = useComponent('ResizeGrip', props);
  if (!grip.resizable) return null;

  return (
    <View
      {...grip.handlers}
      style={slot('root', {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: size,
        height: size,
        cursor: 'nwse-resize',
        borderRadius: theme.radius.radiusSm,
        ...ring(theme, grip.focusVisible, -2),
      })}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        accessible={false}
        style={slot('icon', { pointerEvents: 'none' })}
      >
        <Path
          d="M16 6L6 16M16 11L11 16"
          stroke={color ?? theme.color.textSecondary}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

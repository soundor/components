import { View } from '@soundor/react';

import { useTheme } from '../../theme';

export function Light({ color, size = 5 }: { color: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.radiusFull,
        backgroundColor: color,
      }}
    />
  );
}

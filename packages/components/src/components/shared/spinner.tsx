import { View } from '@soundor/react';
import { useEffect, useState } from 'react';

import { useTheme } from '../../theme';

const dots = 3;

/** Three dots lit in turn: shows that something is under way, with no size of its own to move a layout. */
export function Spinner({ color, size = 4 }: { color: string; size?: number }) {
  const theme = useTheme();
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setLit((i) => (i + 1) % dots), 180);
    return () => clearInterval(timer);
  }, []);
  return (
    <View
      accessible={false}
      style={{ flexDirection: 'row', gap: size - 1, pointerEvents: 'none' }}
    >
      {Array.from({ length: dots }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: theme.radius.radiusFull,
            backgroundColor: color,
            opacity: i === lit ? 1 : 0.3,
          }}
        />
      ))}
    </View>
  );
}

// Where a demo shows: centred on the theme's background, with room around it.
import { useTheme } from '@soundor/components/theme';
import { View } from '@soundor/react';
import type { ReactNode } from 'react';

export function Frame({ children }: { readonly children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: theme.color.background,
      }}
    >
      {/* Shrinks to the demo, so a control that aligns itself to the start
          (Fader, Toggle, ValueField…) is still centred with it. */}
      <View style={{ alignItems: 'center', gap: 16 }}>{children}</View>
    </View>
  );
}

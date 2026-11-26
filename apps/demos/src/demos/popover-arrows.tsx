import { Button, Popover } from '@soundor/components';
import { Text, View, useViewSize } from '@soundor/react';
import { useState } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';

function Example({
  label,
  side,
  align = 'center',
  cornerRadius,
}: {
  label: string;
  side: Side;
  align?: 'start' | 'center' | 'end';
  cornerRadius?: number;
}) {
  const [arrow, setArrow] = useState(true);
  return (
    <Popover>
      <Popover.Trigger>
        <Button>{label}</Button>
      </Popover.Trigger>
      <Popover.Content
        side={side}
        align={align}
        accessibilityLabel={`${label} example`}
        autoFocus={false}
        style={[
          { width: 156 },
          cornerRadius !== undefined && {
            borderBottomLeftRadius: cornerRadius,
          },
        ]}
      >
        {arrow && (
          <>
            <Popover.Arrow debugId="popover-arrow" />
          </>
        )}
        <Button onPress={() => setArrow(!arrow)}>
          {arrow ? 'Hide arrow' : 'Show arrow'}
        </Button>
      </Popover.Content>
    </Popover>
  );
}

export default function Demo() {
  const { width, height } = useViewSize();
  return (
    <View
      style={{
        width: Math.max(0, width - 40),
        height: Math.max(0, height - 40),
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <View style={{ position: 'absolute', top: 0 }}>
        <Example label="Flip at top edge" side="top" />
      </View>
      <View style={{ position: 'absolute', left: 0, bottom: 0 }}>
        <Example label="Shift" side="top" />
      </View>
      <View style={{ position: 'absolute', left: -18, bottom: 42 }}>
        <Example label="Edge" side="top" cornerRadius={30} />
      </View>
      <Text>Choose a side to see the arrow follow its trigger.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Example label="Top" side="top" />
        <Example label="Bottom" side="bottom" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Example label="Left" side="left" align="start" />
        <Example label="Right" side="right" align="end" />
      </View>
    </View>
  );
}

import { Text } from '@soundor/react';
import { type ReactNode } from 'react';

export function Content({
  children,
  style,
}: {
  children: ReactNode;
  style: Parameters<typeof Text>[0]['style'];
}) {
  return typeof children === 'string' || typeof children === 'number' ? (
    <Text accessible={false} style={style}>
      {children}
    </Text>
  ) : (
    <>{children}</>
  );
}

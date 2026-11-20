import { View } from '@soundor/react';

import { useComponent, type StyleProps } from '../../theme';

export interface DividerProps extends StyleProps<'Divider'> {
  orientation?: 'horizontal' | 'vertical';
  length?: number;
}

export function Divider({
  orientation = 'vertical',
  length,
  ...styles
}: DividerProps) {
  const { theme, slot } = useComponent('Divider', styles);
  const thickness = theme.size.borderHairline;
  return (
    <View
      style={slot('root', [
        {
          backgroundColor: theme.color.divider,
          alignSelf: length === undefined ? 'stretch' : 'auto',
        },
        orientation === 'vertical'
          ? { width: thickness, height: length }
          : { height: thickness, width: length },
      ])}
    />
  );
}

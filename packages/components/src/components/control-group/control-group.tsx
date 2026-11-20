import { Text, View } from '@soundor/react';
import { Children, Fragment, type ReactNode } from 'react';

import { textStyle, useComponent, type StyleProps } from '../../theme';
import { Divider } from '../divider';

export interface ControlGroupProps extends StyleProps<'ControlGroup'> {
  title?: string;
  direction?: 'row' | 'column';
  dividers?: boolean;
  gap?: number;
  children?: ReactNode;
}

export function ControlGroup({
  title,
  direction = 'row',
  dividers,
  gap,
  children,
  ...styles
}: ControlGroupProps) {
  const { theme, slot } = useComponent('ControlGroup', styles);
  return (
    <View style={slot('root', { gap: theme.spacing.spaceMd })}>
      {title && (
        <Text
          accessibilityRole="header"
          style={slot('title', textStyle(theme, 'section'))}
        >
          {title.toUpperCase()}
        </Text>
      )}
      <View
        style={slot('content', {
          flexDirection: direction,
          gap: gap ?? theme.spacing.spaceMd,
          alignItems: direction === 'row' ? 'flex-start' : 'stretch',
        })}
      >
        {dividers
          ? Children.toArray(children).map((child, index) => (
              <Fragment key={index}>
                {index > 0 && (
                  <Divider
                    orientation={
                      direction === 'row' ? 'vertical' : 'horizontal'
                    }
                  />
                )}
                {child}
              </Fragment>
            ))
          : children}
      </View>
    </View>
  );
}

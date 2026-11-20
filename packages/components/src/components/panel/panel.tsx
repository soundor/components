import { Text, View } from '@soundor/react';
import { type ReactNode } from 'react';

import { textStyle, useComponent, type StyleProps } from '../../theme';
import { Light } from '../shared/light';

export interface PanelProps extends StyleProps<'Panel'> {
  title?: string;
  trailing?: ReactNode;
  indicator?: boolean | string;
  variant?: 'surface' | 'display' | 'plain';
  children?: ReactNode;
}

export function Panel({
  title,
  trailing,
  indicator,
  variant = 'surface',
  children,
  ...styles
}: PanelProps) {
  const { theme, slot } = useComponent('Panel', styles);
  const c = theme.color;
  return (
    <View
      style={slot('root', [
        { gap: theme.spacing.spaceLg },
        variant === 'surface' && {
          padding: theme.spacing.spaceXl,
          borderRadius: theme.radius.radiusXl,
          backgroundColor: c.surfaceElevated,
          borderWidth: theme.size.borderHairline,
          borderColor: c.border,
        },
        variant === 'display' && {
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: theme.radius.radiusXl,
          backgroundColor: c.display,
        },
      ])}
    >
      {(title || trailing || indicator) && (
        <View
          style={slot('header', {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: theme.spacing.spaceMd,
          })}
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
                color={
                  typeof indicator === 'string'
                    ? indicator
                    : variant === 'display'
                      ? c.lime
                      : c.accentStrong
                }
              />
            )}
            {title && (
              <Text
                accessibilityRole="header"
                style={slot(
                  'title',
                  textStyle(
                    theme,
                    'section',
                    variant === 'display' ? c.displayText : undefined,
                  ),
                )}
              >
                {title.toUpperCase()}
              </Text>
            )}
          </View>
          {typeof trailing === 'string' ? (
            <Text
              style={[
                textStyle(
                  theme,
                  'section',
                  variant === 'display' ? c.displayMuted : undefined,
                ),
                { letterSpacing: 0.8 },
              ]}
            >
              {trailing.toUpperCase()}
            </Text>
          ) : (
            trailing
          )}
        </View>
      )}
      <View style={slot('content', { gap: theme.spacing.spaceLg })}>
        {children}
      </View>
    </View>
  );
}

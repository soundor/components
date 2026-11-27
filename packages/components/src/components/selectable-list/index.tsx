import { Pressable, Text, View } from '@soundor/react';
import type { ReactNode } from 'react';

import {
  useSelection,
  type SelectionItem,
  type SelectionOptions,
} from '../../internal/selection';
import { ring, textStyle, useComponent, type StyleProps } from '../../theme';

export interface SelectableListItemState {
  selected: boolean;
  disabled: boolean;
  focused: boolean;
  hovered: boolean;
}

export interface SelectableListProps<T extends string>
  extends SelectionOptions<T>, StyleProps<'SelectableList'> {
  accessibilityLabel: string;
  renderItem?: (
    item: SelectionItem<T>,
    state: SelectableListItemState,
  ) => ReactNode;
}

/** A controlled selection of named items in a row or column. */
export function SelectableList<T extends string>({
  accessibilityLabel,
  renderItem,
  style,
  styles,
  ...options
}: SelectableListProps<T>) {
  const { items, selectedIds, orientation = 'vertical' } = options;
  const selection = useSelection(options);
  const { theme, slot } = useComponent('SelectableList', { style, styles });
  return (
    <View
      accessibilityRole="listbox"
      accessibilityLabel={accessibilityLabel}
      style={slot('root', {
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
        gap: theme.spacing.spaceXs,
      })}
    >
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        const disabled = Boolean(item.disabled);
        return (
          <Pressable
            key={item.id}
            ref={(node) => selection.attach(item.id, node)}
            accessibilityRole="option"
            accessibilityLabel={item.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            tabStop={selection.tabStop(item.id)}
            onFocus={() => selection.onFocus(item.id)}
            onPress={() => selection.select(item)}
            onKeyDown={(event) => selection.onKeyDown(item.id, event)}
            style={({ focusVisible, hovered }) =>
              slot('item', {
                justifyContent: 'center',
                padding: theme.spacing.spaceSm,
                borderRadius: theme.radius.radiusSm,
                backgroundColor: selected
                  ? theme.color.surfaceInset
                  : hovered
                    ? theme.color.surface
                    : undefined,
                borderWidth: theme.size.borderHairline,
                borderColor: selected
                  ? theme.color.borderStrong
                  : theme.color.border,
                opacity: disabled ? theme.opacity.opacityDisabled : 1,
                ...ring(theme, focusVisible),
              })
            }
          >
            {({ focusVisible, hovered }) =>
              renderItem ? (
                renderItem(item, {
                  selected,
                  disabled,
                  focused: focusVisible,
                  hovered,
                })
              ) : (
                <Text
                  accessible={false}
                  style={slot('label', {
                    ...textStyle(theme, 'body'),
                    // Like Button, use the font's natural metrics for control labels.
                    lineHeight: undefined,
                  })}
                >
                  {item.label}
                </Text>
              )
            }
          </Pressable>
        );
      })}
    </View>
  );
}

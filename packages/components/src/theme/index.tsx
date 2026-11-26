import type { Style, StyleProp } from '@soundor/react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { registerFonts } from './fonts';
import { tokens } from './tokens';

export { registerFonts } from './fonts';

export type ControlSize = 'sm' | 'md' | 'lg';
export type AccentColor = 'lime' | 'lavender' | 'coral';
export type ControlColor = 'neutral' | AccentColor;

type Variable<T> = T extends string
  ? string
  : T extends number
    ? number
    : {
        -readonly [K in keyof T]: K extends 'fontWeight'
          ? Style['fontWeight']
          : Variable<T[K]>;
      };

type Override<T> = T extends object ? { [K in keyof T]?: Override<T[K]> } : T;

export interface ComponentSlots {
  Button: 'root' | 'label';
  Toggle: 'root' | 'label' | 'indicator' | 'track' | 'mixed';
  SegmentedControl: 'root' | 'segment' | 'label';
  Select:
    | 'root'
    | 'label'
    | 'control'
    | 'value'
    | 'icon'
    | 'description'
    | 'popup'
    | 'option';
  /**
   * DropdownMenu's and ContextMenu's menu: `root` is its surface, `heading`
   * a `Menu.Label`.
   */
  Menu: 'root' | 'item' | 'label' | 'icon' | 'separator' | 'heading';
  Popover: 'root';
  Tooltip: 'root' | 'label';
  PopupArrow: 'root';
  Knob: 'root' | 'control' | 'label' | 'value' | 'mixed';
  Slider: 'root' | 'control' | 'label' | 'value' | 'track' | 'thumb' | 'mixed';
  Fader: 'root' | 'control' | 'label' | 'value' | 'track' | 'thumb' | 'mixed';
  ValueField: 'root' | 'control' | 'label' | 'input' | 'mixed';
  TextField: 'root' | 'control' | 'label' | 'input' | 'message';
  LevelMeter: 'root' | 'channel' | 'track' | 'indicator' | 'label';
  Plot: 'root' | 'canvas' | 'title' | 'note';
  PlotMarker: 'root';
  Spectrogram: 'root' | 'canvas';
  FrequencyKeyboard: 'root' | 'canvas';
  SelectableList: 'root' | 'item' | 'label';
  XYPad: 'root' | 'canvas' | 'title' | 'note' | 'value';
  EnvelopeEditor: 'root' | 'plot' | 'handle' | 'values' | 'label' | 'value';
  Panel: 'root' | 'header' | 'title' | 'content';
  ControlGroup: 'root' | 'title' | 'content';
  Divider: 'root';
  ResizeGrip: 'root' | 'icon';
}

type ComponentName = keyof ComponentSlots;
export type SlotStyles<K extends ComponentName> = Partial<
  Record<ComponentSlots[K], Style>
>;
export interface StyleProps<K extends ComponentName> {
  /** Root styles applied after design tokens and theme slots. */
  style?: StyleProp;
  /** Styles for individual component parts. */
  styles?: SlotStyles<K>;
}

export type Theme = Variable<typeof tokens> & {
  components: { [K in ComponentName]?: SlotStyles<K> };
};
export type ThemeOverrides = Override<Omit<Theme, 'components'>> & {
  components?: Theme['components'];
};

export const defaultTheme: Theme = { ...tokens, components: {} };

export function createTheme(
  overrides: ThemeOverrides = {},
  parent = defaultTheme,
): Theme {
  const typography = { ...parent.typography };
  for (const key of Object.keys(
    overrides.typography ?? {},
  ) as (keyof Theme['typography'])[]) {
    Object.assign(typography, {
      [key]: { ...typography[key], ...overrides.typography?.[key] },
    });
  }
  const components = { ...parent.components };
  for (const component of Object.keys(
    overrides.components ?? {},
  ) as ComponentName[]) {
    const inherited = parent.components[component] as
      | Record<string, Style>
      | undefined;
    const changes = overrides.components?.[component] as
      | Record<string, Style>
      | undefined;
    const slots = { ...inherited };
    for (const [slot, style] of Object.entries(changes ?? {})) {
      slots[slot] = { ...inherited?.[slot], ...style };
    }
    Object.assign(components, { [component]: slots });
  }
  return {
    color: { ...parent.color, ...overrides.color },
    font: { ...parent.font, ...overrides.font },
    typography,
    spacing: { ...parent.spacing, ...overrides.spacing },
    radius: { ...parent.radius, ...overrides.radius },
    size: { ...parent.size, ...overrides.size },
    opacity: { ...parent.opacity, ...overrides.opacity },
    components,
  };
}

const ThemeContext = createContext(defaultTheme);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeOverrides;
  children: ReactNode;
}) {
  const parent = useContext(ThemeContext);
  const resolved = useMemo(() => createTheme(theme, parent), [theme, parent]);
  return (
    <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

function useFontsReady(theme: Theme) {
  const usesDefaultFonts =
    theme.font.sans === defaultTheme.font.sans ||
    theme.font.mono === defaultTheme.font.mono;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!usesDefaultFonts) return;
    let mounted = true;
    void registerFonts().then(
      () => {
        if (mounted) setReady(true);
      },
      () => {},
    );
    return () => {
      mounted = false;
    };
  }, [usesDefaultFonts]);
  return !usesDefaultFonts || ready;
}

export function useComponent<K extends ComponentName>(
  name: K,
  props: StyleProps<K>,
) {
  const theme = useTheme();
  const fontsReady = useFontsReady(theme);
  return {
    theme,
    fontsReady,
    slot: (key: ComponentSlots[K], base?: StyleProp): StyleProp => [
      base,
      theme.components[name]?.[key],
      props.styles?.[key],
      key === 'root' && props.style,
    ],
  };
}

export type TextToken = keyof Theme['typography'];

export function textStyle(
  theme: Theme,
  token: TextToken,
  color?: string,
): Style {
  return {
    ...theme.typography[token],
    fontFamily: token === 'value' ? theme.font.mono : theme.font.sans,
    color:
      color ??
      (token === 'value' || token === 'caption'
        ? theme.color.textSecondary
        : token === 'technical' || token === 'section'
          ? theme.color.textMuted
          : theme.color.text),
  };
}

export function controlHeight(theme: Theme, size: ControlSize) {
  return {
    sm: theme.size.controlHeightSm,
    md: theme.size.controlHeightMd,
    lg: theme.size.controlHeightLg,
  }[size];
}

export function ring(theme: Theme, visible: boolean, offset = 2): Style {
  return {
    outlineWidth: visible ? theme.size.focusRing : 0,
    outlineOffset: offset,
    outlineColor: theme.color.focus,
  };
}

export function accents(theme: Theme, color: ControlColor) {
  const c = theme.color;
  if (color === 'neutral')
    return {
      fill: c.trackFill,
      mark: c.accent,
      soft: c.accent,
      edge: c.accentStrong,
      foreground: c.accentForeground,
    };
  return {
    fill: c[`${color}Strong`],
    mark: c[color],
    soft: c[`${color}Soft`],
    edge: c[`${color}Strong`],
    foreground: c[`${color}Foreground`],
  };
}

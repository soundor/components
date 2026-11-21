// A dark palette for the demos, as an application would make one: overrides
// of the default theme's colour tokens, given to a ThemeProvider. The page
// picks it with `?theme=dark`.
import type { ThemeOverrides } from '@soundor/components/theme';

export const dark: ThemeOverrides = {
  color: {
    background: '#15171b',
    surface: '#1e2126',
    surfaceElevated: '#262a30',
    surfaceInset: '#111317',
    text: '#e4e7de',
    textSecondary: '#a9ada2',
    textMuted: '#8b8f85',
    textDisabled: '#5b5f58',
    textInverse: '#262b2e',
    border: '#32363e',
    borderStrong: '#4f5562',
    divider: '#2b2f36',
    focus: '#c0a5ff',
    shadow: 'rgba(0, 0, 0, 0.45)',
    selected: '#d8ebb8',
    selectedForeground: '#1f2a1f',
    control: '#2e3236',
    controlRim: '#575c60',
    track: '#33373f',
    trackFill: '#a9ada2',
    display: '#0c0e14',
  },
};

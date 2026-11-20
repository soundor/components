import { registerFont } from 'soundor:ui';

import sansBold from '../../assets/geist/Geist-Bold.ttf';
import sansMedium from '../../assets/geist/Geist-Medium.ttf';
import sans from '../../assets/geist/Geist-Regular.ttf';
import monoBold from '../../assets/geist/GeistMono-Bold.ttf';
import mono from '../../assets/geist/GeistMono-Regular.ttf';
import { tokens } from './tokens';

let fonts: Promise<void> | undefined;

/** Preload the default faces before rendering, or let styled controls load them on mount. */
export function registerFonts(): Promise<void> {
  return (fonts ??= Promise.all([
    registerFont(tokens.font.sans, sans),
    registerFont(tokens.font.sans, sansMedium, { weight: 500 }),
    registerFont(tokens.font.sans, sansBold, { weight: 700 }),
    registerFont(tokens.font.mono, mono),
    registerFont(tokens.font.mono, monoBold, { weight: 700 }),
  ]).then(
    () => undefined,
    (error: unknown) => {
      fonts = undefined;
      throw error;
    },
  ));
}

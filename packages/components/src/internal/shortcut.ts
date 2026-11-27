import { environment, type HostEnvironment } from 'soundor:host';

export type ShortcutPlatform = HostEnvironment['platform'];

export interface FormatShortcutOptions {
  /** The platform to write it for: by default the one the editor runs on. */
  platform?: ShortcutPlatform;
  /** Words for assistive technology ("Command Shift Z"), not symbols. */
  spoken?: boolean;
}

type Modifier = 'ctrl' | 'alt' | 'shift' | 'meta';

/** Each modifier's names, for the universal syntax; `Mod` is resolved first. */
const modifierNames: Record<string, Modifier> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
};

/** Apple's order (⌃⌥⇧⌘), and the order Windows and Linux menus write. */
const appleOrder: Modifier[] = ['ctrl', 'alt', 'shift', 'meta'];
const pcOrder: Modifier[] = ['ctrl', 'meta', 'alt', 'shift'];

const modifierText = {
  apple: { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' },
  appleSpoken: {
    ctrl: 'Control',
    alt: 'Option',
    shift: 'Shift',
    meta: 'Command',
  },
  windows: { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Win' },
  linux: { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Super' },
  windowsSpoken: {
    ctrl: 'Control',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Windows',
  },
  linuxSpoken: { ctrl: 'Control', alt: 'Alt', shift: 'Shift', meta: 'Super' },
} satisfies Record<string, Record<Modifier, string>>;

/** Named keys: [Apple symbol, Windows and Linux text, spoken]. */
const keys: Record<string, [string, string, string]> = {
  enter: ['↩', 'Enter', 'Enter'],
  return: ['↩', 'Enter', 'Return'],
  escape: ['⎋', 'Esc', 'Escape'],
  esc: ['⎋', 'Esc', 'Escape'],
  tab: ['⇥', 'Tab', 'Tab'],
  space: ['Space', 'Space', 'Space'],
  backspace: ['⌫', 'Backspace', 'Backspace'],
  delete: ['⌦', 'Del', 'Delete'],
  del: ['⌦', 'Del', 'Delete'],
  arrowup: ['↑', 'Up', 'Up Arrow'],
  up: ['↑', 'Up', 'Up Arrow'],
  arrowdown: ['↓', 'Down', 'Down Arrow'],
  down: ['↓', 'Down', 'Down Arrow'],
  arrowleft: ['←', 'Left', 'Left Arrow'],
  left: ['←', 'Left', 'Left Arrow'],
  arrowright: ['→', 'Right', 'Right Arrow'],
  right: ['→', 'Right', 'Right Arrow'],
  home: ['↖', 'Home', 'Home'],
  end: ['↘', 'End', 'End'],
  pageup: ['⇞', 'PgUp', 'Page Up'],
  pagedown: ['⇟', 'PgDn', 'Page Down'],
  plus: ['+', '+', 'Plus'],
  minus: ['-', '-', 'Minus'],
  comma: [',', ',', 'Comma'],
  period: ['.', '.', 'Period'],
};

const apple = (platform: ShortcutPlatform) =>
  platform === 'macos' || platform === 'ios';

export function selectionModifier(event: {
  ctrlKey: boolean;
  metaKey: boolean;
}) {
  return apple(environment.platform) ? event.metaKey : event.ctrlKey;
}

/**
 * A shortcut written once, in a universal syntax, shown the way the platform
 * writes it: `Mod+Shift+Z` is `⇧⌘Z` on macOS and `Ctrl+Shift+Z` on Windows and
 * Linux. Keys are joined by `+`; `Mod` is Command on Apple platforms and
 * Control elsewhere. The other modifiers are `Ctrl`, `Alt` (or `Option`),
 * `Shift` and `Meta` (or `Cmd`, `Win`, `Super`). Named keys include `Enter`,
 * `Escape`, `Tab`, `Space`, `Backspace`, `Delete`, the arrows, `Home`, `End`,
 * `PageUp`, `PageDown` and `Plus`; any other key is shown as written, a letter
 * in capitals. Text that is not in the syntax, such as `⌘C`, is left as it is.
 */
export function formatShortcut(
  shortcut: string,
  {
    platform = environment.platform,
    spoken = false,
  }: FormatShortcutOptions = {},
): string {
  const trimmed = shortcut.trim();
  // A trailing "++" is the + key.
  const parts = trimmed.endsWith('++')
    ? [...trimmed.slice(0, -2).split('+'), '+']
    : trimmed.split('+');
  if (parts.some((part) => !part.trim())) return shortcut;
  const isApple = apple(platform);
  const held = new Set<Modifier>();
  let key: string | undefined;
  for (const [index, raw] of parts.entries()) {
    const name = raw.trim().toLowerCase();
    const modifier =
      name === 'mod' ? (isApple ? 'meta' : 'ctrl') : modifierNames[name];
    if (modifier && index < parts.length - 1) held.add(modifier);
    else if (index === parts.length - 1 && !modifier) key = raw.trim();
    // A modifier as the key, or a key before the last part: not the syntax.
    else return shortcut;
  }
  if (key === undefined) return shortcut;
  const named = keys[key.toLowerCase()];
  const keyText = named
    ? named[spoken ? 2 : isApple ? 0 : 1]
    : key.length === 1
      ? key.toUpperCase()
      : key;
  const names = isApple
    ? spoken
      ? modifierText.appleSpoken
      : modifierText.apple
    : platform === 'windows'
      ? spoken
        ? modifierText.windowsSpoken
        : modifierText.windows
      : spoken
        ? modifierText.linuxSpoken
        : modifierText.linux;
  const modifiers = (isApple ? appleOrder : pcOrder)
    .filter((modifier) => held.has(modifier))
    .map((modifier) => names[modifier]);
  if (spoken) return [...modifiers, keyText].join(' ');
  // Apple writes the symbols together, without separators.
  return [...modifiers, keyText].join(isApple ? '' : '+');
}

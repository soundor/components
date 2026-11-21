import { describe, expect, it } from 'vitest';

import { formatShortcut } from './shortcut';

const mac = { platform: 'macos' } as const;
const windows = { platform: 'windows' } as const;
const linux = { platform: 'linux' } as const;

describe('formatShortcut', () => {
  it('writes Mod as Command on Apple platforms and Control elsewhere', () => {
    expect(formatShortcut('Mod+C', mac)).toBe('⌘C');
    expect(formatShortcut('Mod+C', { platform: 'ios' })).toBe('⌘C');
    expect(formatShortcut('Mod+C', windows)).toBe('Ctrl+C');
    expect(formatShortcut('Mod+C', linux)).toBe('Ctrl+C');
    expect(formatShortcut('Mod+C', { platform: 'unknown' })).toBe('Ctrl+C');
  });

  it("puts modifiers in each platform's order, whatever order they are written in", () => {
    expect(formatShortcut('Shift+Mod+Z', mac)).toBe('⇧⌘Z');
    expect(formatShortcut('Mod+Alt+Shift+Ctrl+K', mac)).toBe('⌃⌥⇧⌘K');
    expect(formatShortcut('Shift+Alt+Mod+K', windows)).toBe('Ctrl+Alt+Shift+K');
    expect(formatShortcut('Meta+Shift+K', windows)).toBe('Win+Shift+K');
    expect(formatShortcut('Meta+K', linux)).toBe('Super+K');
  });

  it('names keys the way each platform does', () => {
    expect(formatShortcut('Backspace', mac)).toBe('⌫');
    expect(formatShortcut('Mod+Delete', windows)).toBe('Ctrl+Del');
    expect(formatShortcut('Alt+ArrowUp', mac)).toBe('⌥↑');
    expect(formatShortcut('Alt+ArrowUp', linux)).toBe('Alt+Up');
    expect(formatShortcut('Escape', windows)).toBe('Esc');
    expect(formatShortcut('Mod+Enter', mac)).toBe('⌘↩');
    expect(formatShortcut('F5', windows)).toBe('F5');
  });

  it('accepts aliases and any case, and the + key', () => {
    expect(formatShortcut('cmd+option+s', mac)).toBe('⌥⌘S');
    expect(formatShortcut('control+s', windows)).toBe('Ctrl+S');
    expect(formatShortcut('Mod++', windows)).toBe('Ctrl++');
    expect(formatShortcut('Mod+Plus', mac)).toBe('⌘+');
  });

  it('speaks a shortcut in words for assistive technology', () => {
    expect(formatShortcut('Mod+Shift+Z', { ...mac, spoken: true })).toBe(
      'Shift Command Z',
    );
    expect(formatShortcut('Mod+Shift+Z', { ...windows, spoken: true })).toBe(
      'Control Shift Z',
    );
    expect(formatShortcut('Alt+ArrowDown', { ...linux, spoken: true })).toBe(
      'Alt Down Arrow',
    );
  });

  it('leaves text that is not in the syntax as it is', () => {
    expect(formatShortcut('⌘C', windows)).toBe('⌘C');
    expect(formatShortcut('Mod+', mac)).toBe('Mod+');
    expect(formatShortcut('Mod+Shift', mac)).toBe('Mod+Shift');
    expect(formatShortcut('A+B', mac)).toBe('A+B');
  });
});

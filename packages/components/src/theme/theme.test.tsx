import { render, screen } from '@soundor/testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { Button } from '../index';
import { createTheme, defaultTheme, ThemeProvider } from '../theme';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('theme overrides merge tokens and slots, and the instance wins over nested providers', async () => {
  const base = createTheme({
    color: { surface: '#334455' },
    components: {
      Button: {
        root: { height: 36, borderRadius: 7 },
        label: { color: '#112233' },
      },
    },
  });
  const merged = createTheme(
    { typography: { button: { fontSize: 12 } } },
    base,
  );
  expect(merged.typography.button.letterSpacing).toBe(
    defaultTheme.typography.button.letterSpacing,
  );
  expect(defaultTheme.color.surface).toBe('#dce0d4');
  await render(
    <ThemeProvider theme={base}>
      <ThemeProvider
        theme={{ components: { Button: { root: { paddingHorizontal: 15 } } } }}
      >
        <Button style={{ height: 32 }}>Play</Button>
      </ThemeProvider>
    </ThemeProvider>,
  );
  const button = screen.getByRole('button', { name: 'Play' });
  expect(button.style).toMatchObject({
    height: 32,
    backgroundColor: '#334455',
    borderRadius: 7,
    paddingHorizontal: 15,
  });
});

import { render, screen, userEvent } from '@soundor/testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { LevelMeter } from '../../index';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('meter exposes dB and latches its clip status until pressed', async () => {
  const app = await render(<LevelMeter label="Output" value={-4} />);
  const clip = screen.getByRole('togglebutton', {
    name: 'Reset Output clip indicator',
  });
  await app.rerender(<LevelMeter label="Output" value={1} />);
  await app.rerender(<LevelMeter label="Output" value={-8} />);
  expect(clip.accessibility.state?.checked).toBe(true);
  expect(
    screen.getByRole('progressbar', { name: 'Output' }).accessibility.value
      ?.text,
  ).toBe('−8.0 dB');
  await userEvent.setup().click(clip);
  expect(clip.accessibility.state?.checked).toBe(false);
});

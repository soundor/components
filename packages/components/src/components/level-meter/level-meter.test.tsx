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
    name: 'Output clip',
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

test('names stereo channels and their clip resets independently', async () => {
  await render(
    <LevelMeter
      label="Output level"
      value={[1, 2]}
      channelLabels={['left', 'right']}
      clipResetLabel={(channel) => `Reset output clip, ${channel}`}
    />,
  );
  expect(
    screen.getByRole('progressbar', { name: 'Output level, left' }),
  ).toBeDefined();
  expect(
    screen.getByRole('progressbar', { name: 'Output level, right' }),
  ).toBeDefined();
  const left = screen.getByRole('togglebutton', {
    name: 'Reset output clip, left',
  });
  const right = screen.getByRole('togglebutton', {
    name: 'Reset output clip, right',
  });
  expect(left.accessibility.state?.checked).toBe(true);
  await userEvent.setup().click(left);
  expect(left.accessibility.state?.checked).toBe(false);
  expect(right.accessibility.state?.checked).toBe(true);
});

test('uses numbered names for channels without a supplied name', async () => {
  const app = await render(<LevelMeter label="Output" value={[-4, -8]} />);
  expect(
    screen.getByRole('progressbar', { name: 'Output, channel 1' }),
  ).toBeDefined();
  expect(
    screen.getByRole('togglebutton', {
      name: 'Output clip, channel 1',
    }),
  ).toBeDefined();

  await app.rerender(
    <LevelMeter label="Output" value={[-4, -8]} channelLabels={['left']} />,
  );
  expect(
    screen.getByRole('progressbar', { name: 'Output, channel 2' }),
  ).toBeDefined();
  expect(
    screen.getByRole('togglebutton', {
      name: 'Output clip, left',
    }),
  ).toBeDefined();
  expect(
    screen.getByRole('togglebutton', {
      name: 'Output clip, channel 2',
    }),
  ).toBeDefined();
});

test('formats the clip-reset name on an unnamed mono meter', async () => {
  await render(
    <LevelMeter
      label="Output"
      value={-4}
      clipResetLabel={(channel) =>
        channel === undefined
          ? 'Reset output clip'
          : `Reset output clip, ${channel}`
      }
    />,
  );
  expect(screen.getByRole('progressbar', { name: 'Output' })).toBeDefined();
  expect(
    screen.getByRole('togglebutton', { name: 'Reset output clip' }),
  ).toBeDefined();
});

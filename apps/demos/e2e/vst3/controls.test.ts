import { expect, test } from 'vitest';

import { gestures, idOf, launch, normalized, shown } from './plugin';

// The gallery's controls, each bound to a parameter of the plugin.

test('automation from the host moves the knob', async () => {
  const { plugin } = await launch();

  await plugin.parameter('Feedback').set(0.25);

  await expect.poll(shown(plugin, 'Feedback')).toBe('0.250');
});

test('a drag down on the fader lowers the gain', async () => {
  const { plugin } = await launch();

  await plugin.getByRole('adjustable', { name: 'Gain' }).drag({ deltaY: 30 });

  await expect.poll(normalized(plugin, 'Gain')).toBeLessThan(0.8);
});

test('the switch turns Bypass on, in one gesture', async () => {
  const { plugin, edits } = await launch();
  const id = await idOf(plugin, 'Bypass');

  await plugin.getByRole('switch', { name: 'Bypass' }).click();

  await expect.poll(normalized(plugin, 'Bypass')).toBe(1);
  expect(gestures(edits.filter((edit) => edit.id === id))).toEqual([
    'begin',
    'end',
  ]);
});

test('a segment chooses the mode', async () => {
  const { plugin } = await launch();

  await plugin.getByRole('radio', { name: 'Free' }).click();

  await expect.poll(normalized(plugin, 'Mode')).toBe(1);
});

test('a value typed into the ValueField reaches the parameter', async () => {
  const { plugin } = await launch();
  const time = plugin.getByRole('adjustable', { name: 'Time' });

  await time.dblclick();
  await plugin.keyboard.press('Control+a');
  await plugin.keyboard.type('500');
  await plugin.keyboard.press('Enter');

  await expect
    .poll(async () => (await plugin.parameter('Time').get()).plain)
    .toBeCloseTo(500, 3);
});

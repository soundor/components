import { expect, test } from 'vitest';

import { gestures, idOf, launch, normalized, type Edit } from './plugin';

// What a host records from the gallery's Feedback knob, whose parameter's
// default is 0.4: every change inside one gesture, as automation is written.
const forFeedback = async (
  plugin: Awaited<ReturnType<typeof launch>>['plugin'],
  edits: Edit[],
) => {
  const id = await idOf(plugin, 'Feedback');
  return () => edits.filter((edit) => edit.id === id);
};

test('a drag is one gesture, and the host gets every value of it', async () => {
  const { plugin, edits } = await launch();
  const feedback = await forFeedback(plugin, edits);

  await plugin
    .getByRole('adjustable', { name: 'Feedback' })
    .drag({ deltaY: -40 });

  await expect.poll(() => gestures(feedback())).toEqual(['begin', 'end']);
  const value = await normalized(plugin, 'Feedback')();
  expect(value).toBeGreaterThan(0.45);
  const performed = feedback().filter((edit) => edit.type === 'perform');
  expect(performed.length).toBeGreaterThan(1);
  expect(performed.at(-1)).toMatchObject({ value: expect.closeTo(value, 5) });
});

test('Esc during a drag restores the value, inside the same gesture', async () => {
  const { plugin, edits } = await launch();
  const feedback = await forFeedback(plugin, edits);
  const box = await plugin
    .getByRole('adjustable', { name: 'Feedback' })
    .getBounds();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await plugin.pointer.move(x, y);
  await plugin.pointer.down();
  await plugin.pointer.move(x, y - 40);
  await expect.poll(normalized(plugin, 'Feedback')).toBeGreaterThan(0.45);
  await plugin.keyboard.press('Escape');
  await plugin.pointer.up();

  await expect.poll(normalized(plugin, 'Feedback')).toBeCloseTo(0.4, 5);
  expect(gestures(feedback())).toEqual(['begin', 'end']);
  const performed = feedback().filter((edit) => edit.type === 'perform');
  expect(performed.at(-1)).toMatchObject({ value: expect.closeTo(0.4, 5) });
});

test.for([
  ['a double-click', 'dblclick'],
  ['an Alt-click', 'altClick'],
  ['Delete', 'Delete'],
  ['Backspace', 'Backspace'],
] as const)('%s resets with one edit, inside a gesture', async ([, how]) => {
  const { plugin, edits } = await launch();
  const feedback = await forFeedback(plugin, edits);
  const knob = plugin.getByRole('adjustable', { name: 'Feedback' });
  // Automation from the host: no gesture of the editor's.
  await plugin.parameter('Feedback').set(0.9);
  if (how === 'Delete' || how === 'Backspace') await knob.focus();
  expect(feedback()).toEqual([]);

  if (how === 'dblclick') await knob.dblclick();
  else if (how === 'altClick') await knob.click({ modifiers: ['Alt'] });
  else await knob.press(how);

  await expect.poll(normalized(plugin, 'Feedback')).toBeCloseTo(0.4, 5);
  // One edit, to the default, inside a gesture. A double-click's presses
  // each touch the knob first, as any press does: gestures without edits.
  const performed = feedback().filter((edit) => edit.type === 'perform');
  expect(performed).toEqual([
    { type: 'perform', id: performed[0]?.id, value: expect.closeTo(0.4, 5) },
  ]);
  const markers = gestures(feedback());
  expect(markers).toEqual(
    how === 'dblclick'
      ? ['begin', 'end', 'begin', 'end', 'begin', 'end']
      : ['begin', 'end'],
  );
  const reset = feedback().findIndex((edit) => edit.type === 'perform');
  expect(feedback()[reset - 1]?.type).toBe('begin');
  expect(feedback()[reset + 1]?.type).toBe('end');
});

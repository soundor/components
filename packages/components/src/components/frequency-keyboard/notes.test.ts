import { expect, test } from 'vitest';

import { keyboardNotes, noteFrequency } from './notes';

test('maps octaves and accidentals at the requested tuning', () => {
  const notes = keyboardNotes([210, 910], 442);
  expect(notes.find((note) => note.note === 69)).toMatchObject({
    hz: 442,
    octave: 4,
    name: 'A',
    black: false,
  });
  expect(notes.find((note) => note.note === 70)).toMatchObject({
    name: 'A♯',
    black: true,
  });
  expect(noteFrequency(81, 442)).toBe(884);
  expect(noteFrequency(57, 442)).toBe(221);
  expect(keyboardNotes([0, 20000], 440)).toEqual([]);
});

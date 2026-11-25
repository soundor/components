import type { Domain } from '../../internal/scale';

const names = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const;

export function noteFrequency(note: number, tuning: number) {
  return tuning * 2 ** ((note - 69) / 12);
}

export function keyboardNotes([low, high]: Domain, tuning: number) {
  if (
    !(low > 0 && high > low && tuning > 0) ||
    !Number.isFinite(high) ||
    !Number.isFinite(tuning)
  )
    return [];
  const noteAt = (hz: number) => 69 + 12 * (Math.log2(hz) - Math.log2(tuning));
  // Include partially visible keys at either edge. Bound work even for
  // pathological ranges; this spans far beyond audible pitches.
  const first = Math.max(-128, Math.ceil(noteAt(low) - 1));
  const last = Math.min(255, Math.floor(noteAt(high) + 1));
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => {
    const note = first + i;
    const pitch = ((note % 12) + 12) % 12;
    const name = names[pitch]!;
    const black = name.includes('♯');
    const octave = Math.floor(note / 12) - 1;
    return {
      name,
      note,
      black,
      octave,
      hz: noteFrequency(note, tuning),
      low: noteFrequency(note - (black ? 0.43 : 0.57), tuning),
      high: noteFrequency(note + (black ? 0.43 : 0.57), tuning),
    };
  });
}

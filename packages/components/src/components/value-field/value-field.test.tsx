import {
  advanceTime,
  render,
  screen,
  userEvent,
} from '@soundor/testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { ValueField, formatters, parsers } from '../../index';
import { defaultTheme } from '../../theme';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('mixed text entry starts from mixedStart and commits using the normal parser', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn<(value: number) => void>();
  await render(
    <ValueField
      label="Time"
      mixed
      mixedLabel="Varies"
      mixedStart={1500}
      value={1200}
      defaultValue={500}
      max={2000}
      format={formatters.time}
      onChange={onChange}
    />,
  );
  const field = () => screen.getByRole('adjustable', { name: 'Time' });
  expect(field().accessibility.value?.text).toBe('Varies');
  await user.dblClick(field());
  expect(screen.getByRole('textinput', { name: 'Time' }).value).toBe('1.50 s');
  await user.keyboard('{Tab}');
  expect(onChange).not.toHaveBeenCalled();
  await user.dblClick(field());
  await user.keyboard('1.2{Enter}');
  expect(onChange).toHaveBeenCalledExactlyOnceWith(1200);
  expect(field().accessibility.value?.text).toBe('Varies');
});

test('value entry keeps affixes, rejects invalid input, and cancels on Escape', async () => {
  const user = userEvent.setup();
  await render(
    <ValueField
      label="Pan"
      defaultValue={-0.3}
      min={-1}
      max={1}
      format={formatters.pan}
      parse={parsers.pan}
    />,
  );
  const field = () => screen.getByRole('adjustable', { name: 'Pan' });
  await user.dblClick(field());
  const input = () => screen.getByRole('textinput', { name: 'Pan' });
  // The prefix is part of the text, and only the number is selected.
  expect(input().value).toBe('L 30');
  expect([input().selectionStart, input().selectionEnd]).toEqual([2, 4]);
  await user.type(input(), '20');
  await user.keyboard('{Enter}');
  expect(field().accessibility.value?.text).toBe('L 20');
  // Select everything and the prefix changes with the number.
  await user.keyboard('{Enter}');
  await user.keyboard('{Control>}a{/Control}R 12{Enter}');
  expect(field().accessibility.value?.text).toBe('R 12');
  await user.keyboard('{Enter}');
  await user.keyboard('{Control>}a{/Control}20{Enter}');
  expect(field().accessibility.value?.text).toBe('R 20');
  await user.keyboard('{Enter}');
  await user.keyboard('{Control>}a{/Control}L 20{Enter}');
  expect(field().accessibility.value?.text).toBe('L 20');
  await user.keyboard('{Enter}');
  await user.type(input(), 'wrong');
  await user.keyboard('{Enter}');
  expect(input().parent?.style.borderColor).toBe(defaultTheme.color.danger);
  await user.keyboard('{Escape}');
  expect(field().focused).toBe(true);
  expect(field().accessibility.value?.text).toBe('L 20');
});

test('typing a bare number keeps the displayed unit, and a typed unit replaces it', async () => {
  const user = userEvent.setup();
  await render(
    <ValueField
      label="Time"
      defaultValue={1500}
      min={1}
      max={2000}
      format={formatters.time}
      parse={parsers.number}
    />,
  );
  const field = () => screen.getByRole('adjustable', { name: 'Time' });
  const input = () => screen.getByRole('textinput', { name: 'Time' });
  await user.dblClick(field());
  // A double-click shows no focus ring; Enter, below, keeps the keyboard's.
  expect(input().parent?.style.outlineWidth).toBe(0);
  // The unit is part of the text, and only the number is selected.
  expect(input().value).toBe('1.50 s');
  expect([input().selectionStart, input().selectionEnd]).toEqual([0, 4]);
  await user.keyboard('1.2{Enter}');
  expect(field().accessibility.value?.text).toBe('1.20 s');
  await user.keyboard('{Enter}');
  expect(input().parent?.style.outlineWidth).toBe(defaultTheme.size.focusRing);
  await user.keyboard('{Control>}a{/Control}500 ms{Enter}');
  expect(field().accessibility.value?.text).toBe('500 ms');
  await user.keyboard('{Enter}');
  // Shown in ms, a bare number is ms; a unit says otherwise.
  await user.keyboard('{Control>}a{/Control}2{Enter}');
  expect(field().accessibility.value?.text).toBe('2 ms');
  await user.keyboard('{Enter}');
  await user.keyboard('{Control>}a{/Control}2 s{Enter}');
  expect(field().accessibility.value?.text).toBe('2.00 s');
  // Typing a unit with only the number selected replaces the old one.
  await user.keyboard('{Enter}');
  await user.keyboard('800 ms{Enter}');
  expect(field().accessibility.value?.text).toBe('800 ms');
});

test('a value wider than the field is shown whole by making its text smaller', async () => {
  const base = defaultTheme.typography.value.fontSize;
  const field = (value: number) => (
    <ValueField label="Gain" value={value} min={0} max={1e9} width={72} />
  );
  const { rerender } = await render(field(42));
  // Each text is there twice: the preview, then the invisible copy it is
  // measured by.
  const shown = (text: string) =>
    screen.getAllByText(text, { hidden: true })[0]!.style.fontSize;
  const settle = () => advanceTime(50);
  // The simulated runtime has no layout, so nothing is measured and the
  // text keeps its size.
  await rerender(field(123456789));
  await settle();
  expect(shown('123456789.00')).toBe(base);
  await rerender(field(42));
  // With layout: a monospace character is 0.6 em wide.
  const measure = vi
    .spyOn(
      Object.getPrototypeOf(screen.getAllByText('42.00', { hidden: true })[0]!),
      'getBoundingClientRect',
    )
    .mockImplementation(function (this: {
      style: { fontSize?: number };
      text: string;
    }) {
      return { width: (this.style.fontSize ?? 0) * 0.6 * this.text.length };
    });
  try {
    await rerender(field(43));
    await settle();
    expect(shown('43.00')).toBe(base);
    await rerender(field(123456789));
    await settle();
    const size = shown('123456789.00') as number;
    expect(size).toBeLessThan(base);
    // 12 characters fit the 72, less its padding and borders.
    expect(size * 0.6 * 12).toBeLessThanOrEqual(72 - 2 * 9);
    await rerender(field(5));
    await settle();
    expect(shown('5.00')).toBe(base);
  } finally {
    measure.mockRestore();
  }
});

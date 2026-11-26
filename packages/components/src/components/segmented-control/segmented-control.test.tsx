import { render, screen, userEvent } from '@soundor/testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { Button, SegmentedControl, Toggle } from '../../index';
import { defaultTheme } from '../../theme';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test.each(['click', 'ArrowRight', 'End'])(
  'mixed segments are all unchecked and resolve with %s',
  async (action) => {
    const onChange = vi.fn<(value: string) => void>();
    const user = userEvent.setup();
    await render(
      <SegmentedControl
        label="Mode"
        mixed
        value="b"
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );
    expect(
      screen.getByRole('radiogroup', { name: 'Mode' }).accessibility.hint,
    ).toBe('Mixed');
    const [first, second] = screen.getAllByRole('radio');
    expect(first?.accessibility.state?.checked).toBe(false);
    expect(second?.accessibility.state?.checked).toBe(false);
    expect(first?.focusable).toBe(true);
    if (action === 'click') await user.click(second!);
    else {
      await user.tab();
      await user.keyboard(`{${action}}`);
    }
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b');
    expect(second?.accessibility.state?.checked).toBe(false);
  },
);

test('action controls expose live states and segmented keyboard focus skips disabled options', async () => {
  const onPress = vi.fn<() => void>();
  await render(
    <>
      <Button disabled onPress={onPress}>
        Disabled
      </Button>
      <Toggle label="Hold" size="lg" />
      <SegmentedControl
        label="Mode"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B', disabled: true },
          { value: 'c', label: 'C' },
        ]}
      />
    </>,
  );
  const user = userEvent.setup();
  const disabled = screen.getByRole('button', { name: 'Disabled' });
  expect(disabled.focusable).toBe(false);
  await user.click(disabled);
  expect(onPress).not.toHaveBeenCalled();
  const toggle = screen.getByRole('togglebutton', { name: 'Hold' });
  expect(toggle.style.height).toBe(50);
  await user.click(toggle);
  expect(toggle.accessibility.state?.checked).toBe(true);
  expect(toggle.style.backgroundColor).toBe(defaultTheme.color.accent);
  const first = screen.getByRole('radio', { name: 'A' });
  const third = screen.getByRole('radio', { name: 'C' });
  expect(first.focusable).toBe(true);
  expect(third.focusable).toBe(false);
  first.focus();
  await user.keyboard('{ArrowRight}');
  expect(third.focused).toBe(true);
  expect(third.accessibility.state?.checked).toBe(true);
  expect(first.focusable).toBe(false);
});

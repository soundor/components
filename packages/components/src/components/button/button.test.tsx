import { render, screen, userEvent } from '@soundor/testing-library/react';
import { expect, test, vi } from 'vitest';

import { Button } from '../../index';

test('a loading Button ignores presses, reports busy and keeps its label for assistive technology', async () => {
  const user = userEvent.setup();
  const onPress = vi.fn<() => void>();
  const { rerender } = await render(<Button onPress={onPress}>Save</Button>);
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await rerender(
    <Button loading onPress={onPress}>
      Save
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Save' });
  expect(button.accessibility.state?.busy).toBe(true);
  await user.click(button);
  button.focus();
  await user.keyboard('{Enter}');
  expect(onPress).toHaveBeenCalledTimes(1);
  await rerender(<Button onPress={onPress}>Save</Button>);
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onPress).toHaveBeenCalledTimes(2);
});

test('a disabled Button ignores presses and cannot be focused', async () => {
  const user = userEvent.setup();
  const onPress = vi.fn<() => void>();
  await render(
    <Button disabled onPress={onPress}>
      Apply
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Apply' });
  expect(button.accessibility.state?.disabled).toBe(true);
  await user.click(button);
  await user.tab();
  expect(onPress).not.toHaveBeenCalled();
  expect(button.focused).toBe(false);
});

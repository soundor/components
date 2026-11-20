import { render, screen, userEvent } from '@soundor/testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';

import { TextField } from '../../index';

test('TextField edits its own text, reports each change and submits on Enter', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn<(text: string) => void>();
  const onSubmit = vi.fn<(text: string) => void>();
  await render(
    <TextField
      label="Name"
      defaultValue="Lead"
      onChange={onChange}
      onSubmit={onSubmit}
    />,
  );
  const input = screen.getByRole('textinput', { name: 'Name' });
  expect(input.value).toBe('Lead');
  await user.click(input);
  await user.keyboard(' 2');
  expect(onChange).toHaveBeenLastCalledWith('Lead 2');
  await user.keyboard('{Enter}');
  expect(onSubmit).toHaveBeenLastCalledWith('Lead 2');
});

test('TextField follows a controlled value', async () => {
  const user = userEvent.setup();
  function Fixture() {
    const [text, setText] = useState('');
    return (
      <TextField
        label="Preset"
        value={text}
        onChange={(next) => setText(next.toUpperCase())}
      />
    );
  }
  await render(<Fixture />);
  const input = screen.getByRole('textinput', { name: 'Preset' });
  await user.click(input);
  await user.keyboard('abc');
  expect(input.value).toBe('ABC');
});

test('TextField says why a value is wrong and cannot be edited while disabled', async () => {
  await render(
    <>
      <TextField label="Tag" defaultValue="x" error="Use letters only" />
      <TextField label="Locked" defaultValue="fixed" disabled />
    </>,
  );
  expect(screen.getByText('Use letters only')).toBeDefined();
  expect(
    screen.getByRole('textinput', { name: 'Tag' }).accessibility.hint,
  ).toBe('Use letters only');
  expect(screen.queryByRole('textinput', { name: 'Locked' })).toBeNull();
});

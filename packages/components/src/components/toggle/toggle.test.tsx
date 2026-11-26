import { render, screen, userEvent } from '@soundor/testing-library/react';
import { expect, test, vi } from 'vitest';

import { Toggle } from '../../index';

test.each(['button', 'chip', 'switch'] as const)(
  'a mixed %s announces indeterminate and resolves to on by default',
  async (variant) => {
    const onChange = vi.fn<(value: boolean) => void>();
    const user = userEvent.setup();
    const { rerender } = await render(
      <Toggle label="Solo" value mixed variant={variant} onChange={onChange} />,
    );
    const control = screen.getByRole('checkbox', { name: 'Solo' });
    expect(control.accessibility.state?.checked).toBe('mixed');
    await user.tab();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(control.accessibility.state?.checked).toBe('mixed');
    await rerender(
      <Toggle
        label="Solo"
        value={false}
        mixed
        variant={variant}
        mixedPress="off"
        onChange={onChange}
      />,
    );
    await user.click(control);
    expect(onChange).toHaveBeenLastCalledWith(false);
  },
);

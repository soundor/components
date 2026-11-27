import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('extended list selection follows pointer and keyboard modifiers', async ({
  page,
}) => {
  await openDemo(page, 'selectable-list');
  const list = page.getByRole('listbox', { name: 'Modulation sources' });
  const one = list.getByRole('option', { name: 'LFO 1' });
  const two = list.getByRole('option', { name: 'LFO 2' });
  const three = list.getByRole('option', { name: 'LFO 3' });
  const disabled = list.getByRole('option', { name: 'Envelope' });

  await two.click();
  await expect(one).toHaveAttribute('aria-selected', 'false');
  await three.click({ modifiers: ['Shift'] });
  await expect(two).toHaveAttribute('aria-selected', 'true');
  await expect(three).toHaveAttribute('aria-selected', 'true');
  await expect(disabled).toHaveAttribute('aria-selected', 'false');
  await one.click({ modifiers: ['ControlOrMeta'] });
  await expect(list.getByRole('option', { selected: true })).toHaveCount(3);
  await page.keyboard.press('ArrowRight');
  await expect(two).toBeFocused();
  await expect(list.getByRole('option', { selected: true })).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect(list.getByRole('option', { selected: true })).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+a');
  await expect(list.getByRole('option', { selected: true })).toHaveCount(3);
});

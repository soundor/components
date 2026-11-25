import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('shows on hover and keyboard focus, and hides on press or Escape', async ({
  page,
}) => {
  await openDemo(page, 'tooltip');
  const target = page.getByRole('button', { name: 'Analyzer' });
  const tip = page.getByText('Includes the post-effects signal', {
    exact: true,
  });
  await target.hover();
  await expect(tip).toBeVisible();
  await target.click();
  await expect(tip).toHaveCount(0);
  await page.getByRole('button', { name: 'Before tooltip' }).click();
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toHaveCount(0);
  await expect(target).toBeFocused();
});

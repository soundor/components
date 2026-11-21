import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

// The context menu demo: Feedback, Mix and Gain, each with its parameter's menu.
test.beforeEach(async ({ page }) => {
  await openDemo(page, 'context-menu');
});

test('a right-click opens the menu, and Reset to default resets', async ({
  page,
}) => {
  const knob = page.getByRole('slider', { name: 'Feedback' });
  await knob.click();
  await page.keyboard.press('End');
  await expect(knob).toHaveAttribute('aria-valuetext', '1.000');
  await knob.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Reset to default' }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(knob).toHaveAttribute('aria-valuetext', '0.400');
});

test('Esc closes the menu and gives focus back', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Mix' });
  await slider.click({ button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(slider).toBeFocused();
});

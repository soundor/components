import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

// The dropdown menu demo: a Preset menu on a Button, and a View menu on a
// trigger of the demo's own.
test.beforeEach(async ({ page }) => {
  await openDemo(page, 'dropdown-menu');
});

test('a click opens the menu below its Button, and an item runs and closes it', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Preset' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Preset' });
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const below = await trigger.boundingBox();
  const at = await menu.boundingBox();
  expect(at!.y).toBeGreaterThanOrEqual(below!.y + below!.height);
  await page.getByRole('menuitem', { name: 'Save As…' }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(page.getByText('Last action: Save As')).toBeVisible();
  await expect(trigger).toBeFocused();
});

test('the keyboard moves past disabled items, and Esc gives focus back', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Preset' });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('menuitem', { name: 'Save', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  // Paste Preset is disabled: skipped.
  await expect(
    page.getByRole('menuitem', { name: 'Initialize' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('a custom trigger opens its menu, with a checked item', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'View options' }).click();
  const snap = page.getByRole('menuitem', { name: 'Snap to grid' });
  await expect(snap).toBeVisible();
  await snap.click();
  await page.getByRole('button', { name: 'View options' }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Snap to grid' }),
  ).toBeVisible();
});

import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('a band can be created, edited through its floating controls, and removed', async ({
  page,
}) => {
  await openDemo(page, 'equalizer-reference');
  await page.getByRole('button', { name: 'Add band', exact: true }).click();
  const marker = page.getByRole('slider', { name: 'Band 4' });
  const editor = page.getByRole('dialog', { name: 'Band editor' });
  await expect(marker).toBeVisible();
  await expect(editor).toBeVisible();
  await editor.getByRole('combobox', { name: 'Filter type' }).click();
  await page.getByRole('menuitem', { name: 'Low shelf' }).click();
  await expect(
    editor.getByRole('combobox', { name: 'Filter type' }),
  ).toHaveAttribute('aria-valuetext', 'Low shelf');
  await editor.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Remove selected' }).click();
  await expect(marker).toHaveCount(0);
});

import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('the embedded band editor scrolls to reveal its Done button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 460 });
  await page.goto('/?embed&demo=equalizer-reference');
  await page.getByRole('button', { name: 'Add band', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Band editor' });
  const done = editor.getByRole('button', { name: 'Done' });
  await expect(done).not.toBeInViewport();
  await editor.getByRole('combobox', { name: 'Filter type' }).hover();
  await page.mouse.wheel(0, 400);
  await expect(done).toBeInViewport({ ratio: 0.99 });
  await done.click();
  await expect(editor).toHaveCount(0);
});

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

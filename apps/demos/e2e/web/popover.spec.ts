import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('the external editor stays open and follows its anchor', async ({
  page,
}) => {
  await openDemo(page, 'popover');
  const anchor = page.getByRole('button', { name: 'Move anchor' });
  await page.getByRole('button', { name: 'Open editor' }).click();
  const editor = page.getByRole('dialog', { name: 'Floating editor' });
  await expect(editor).toBeVisible();
  const scrollRange = await editor.evaluate((node) =>
    Math.max(
      0,
      ...[node, ...node.querySelectorAll('*')]
        .filter((child) => getComputedStyle(child).overflowY === 'scroll')
        .map((child) => child.scrollHeight - child.clientHeight),
    ),
  );
  expect(scrollRange).toBe(0);
  const initial = await editor.boundingBox();
  await anchor.click();
  await expect
    .poll(async () => (await editor.boundingBox())?.x)
    .not.toBe(initial?.x);
  await expect(anchor).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
});

test('selecting a value in a nested overlay keeps the editor open', async ({
  page,
}) => {
  await openDemo(page, 'popover');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Quality' }).click();
  await page.getByRole('menuitem', { name: 'Studio' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
});

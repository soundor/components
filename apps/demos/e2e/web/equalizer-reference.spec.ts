import { expect, test } from '@playwright/test';

import { centreOf, openDemo } from './demo';

test('the band list takes one Tab stop and remembers arrow-key focus', async ({
  page,
}) => {
  await openDemo(page, 'equalizer-reference');
  const bands = page.getByRole('listbox', { name: 'Bands' });
  const first = bands.getByRole('option', { name: 'Band 1' });
  const second = bands.getByRole('option', { name: 'Band 2' });
  const add = page.getByRole('button', { name: 'Add band' });

  await first.click();
  await expect(first).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(add).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'false');
  await page.keyboard.press('Tab');
  await expect(add).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(second).toBeFocused();
});

test('a group on the logarithmic axis changes drag speed without jumping', async ({
  page,
}) => {
  await openDemo(page, 'equalizer-reference');
  const a = page.getByRole('slider', { name: 'Band 1' });
  const b = page.getByRole('slider', { name: 'Band 2' });
  const start = await centreOf(a);
  const other = await centreOf(b);
  await page.mouse.move(start.x - 18, start.y - 13);
  await page.mouse.down();
  await page.mouse.move(other.x + 18, other.y + 12);
  await page.mouse.up();
  await expect(a).toHaveAttribute('aria-selected', 'true');
  await expect(b).toHaveAttribute('aria-selected', 'true');

  const move = async (travel: number, expected: number) => {
    await page.mouse.move(start.x + travel, start.y);
    await expect
      .poll(async () => (await centreOf(a)).x - start.x)
      .toBeCloseTo(expected, 0);
    expect((await centreOf(b)).x - other.x).toBeCloseTo(expected, 0);
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await move(20, 2);
  await page.keyboard.up('Shift');
  await move(30, 12);
  await page.keyboard.down('Shift');
  await move(50, 14);
  await page.keyboard.up('Shift');
  await page.mouse.up();
  await expect(a).toHaveAttribute('aria-selected', 'true');
  await expect(b).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('dialog', { name: 'Band editor' })).toHaveCount(
    0,
  );
});

test('the embedded band editor scrolls to reveal its Done button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 460 });
  await page.goto('/?embed&demo=equalizer-reference');
  await page.getByRole('button', { name: 'Add band', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Band editor' });
  const done = editor.getByRole('button', { name: 'Done' });
  await expect(done).not.toBeInViewport();
  // The inset beside the controls is part of the scrollable area.
  await editor.hover({ position: { x: 4, y: 4 } });
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

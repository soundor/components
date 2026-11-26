import { expect, test, type Page } from '@playwright/test';

import { centreOf, openDemo } from './demo';

/**
 * Moves in steps 40 ms apart: far enough apart that the runtime sees the
 * pointer over each row on the way (closer steps reach it as one jump), and
 * at about 0.6 px/ms here, quick enough to be aiming.
 */
async function sweep(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 6,
) {
  await page.mouse.move(from.x, from.y);
  for (let i = 1; i <= steps; i++) {
    await page.waitForTimeout(40);
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
  }
}

// The submenu demo: Band (one level), Filter (two levels and a long
// submenu) and, at the right edge, Output (a submenu flipped to the left).
test.beforeEach(async ({ page }) => {
  await openDemo(page, 'submenu');
});

async function openBand(page: Page) {
  await page.getByRole('button', { name: 'Band' }).click();
  return page.getByRole('menuitem', { name: 'Filter type' });
}

test('resting on the trigger opens the submenu beside the menu, its first row level with the trigger', async ({
  page,
}) => {
  const trigger = await openBand(page);
  await trigger.hover();
  const submenu = page.getByRole('menu', { name: 'Filter type' });
  await expect(submenu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const menu = await page.getByRole('menu', { name: 'Band' }).boundingBox();
  const row = await trigger.boundingBox();
  const first = await page
    .getByRole('menuitem', { name: 'Bell' })
    .boundingBox();
  const at = await submenu.boundingBox();
  // On the right, over the menu's edge by no more than a few pixels.
  expect(at!.x).toBeGreaterThan(menu!.x + menu!.width - 4);
  expect(Math.abs(first!.y - row!.y)).toBeLessThanOrEqual(1);
});

test('a quick move straight at the submenu, across the rows below, keeps it open', async ({
  page,
}) => {
  const trigger = await openBand(page);
  await trigger.hover();
  const submenu = page.getByRole('menu', { name: 'Filter type' });
  await expect(submenu).toBeVisible();
  const row = (await trigger.boundingBox())!;
  const target = (await page
    .getByRole('menuitem', { name: 'Band Pass' })
    .boundingBox())!;
  // From the trigger's start down and right to Band Pass, over Solo and
  // Delete for long enough that the runtime sees the pointer on them.
  await sweep(
    page,
    { x: row.x + 6, y: row.y + row.height / 2 },
    { x: target.x + target.width / 2, y: target.y + target.height / 2 },
    8,
  );
  await expect(submenu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(
    page.getByText('Filter: Band Pass', { exact: false }),
  ).toBeVisible();
});

test('a slow move down to the next row switches to it and closes the submenu', async ({
  page,
}) => {
  const trigger = await openBand(page);
  await trigger.hover();
  const submenu = page.getByRole('menu', { name: 'Filter type' });
  await expect(submenu).toBeVisible();
  const solo = page.getByRole('menuitem', { name: 'Solo' });
  const from = await centreOf(trigger);
  const to = await centreOf(solo);
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(from.x + i, from.y + ((to.y - from.y) * i) / 6);
    await page.waitForTimeout(40);
  }
  await expect(submenu).toHaveCount(0);
  await expect(solo).toBeFocused();
});

test('resting on another row on the way switches to it', async ({ page }) => {
  const trigger = await openBand(page);
  await trigger.hover();
  const submenu = page.getByRole('menu', { name: 'Filter type' });
  await expect(submenu).toBeVisible();
  const solo = page.getByRole('menuitem', { name: 'Solo' });
  const row = (await trigger.boundingBox())!;
  const box = (await solo.boundingBox())!;
  // Quickly onto Solo, towards the submenu, and then still.
  await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2);
  await page.mouse.move(row.x + row.width - 12, box.y + 4, { steps: 2 });
  await expect(submenu).toHaveCount(0, { timeout: 1000 });
  await expect(solo).toBeFocused();
});

test('at the right edge the submenu flips to the left, and aiming at it works the same', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Output' }).click();
  const trigger = page.getByRole('menuitem', { name: 'Channels' });
  await trigger.hover();
  const submenu = page.getByRole('menu', { name: 'Channels' });
  await expect(submenu).toBeVisible();
  const menu = (await page
    .getByRole('menu', { name: 'Output' })
    .boundingBox())!;
  const at = (await submenu.boundingBox())!;
  expect(at.x + at.width).toBeLessThan(menu.x + 4);
  const row = (await trigger.boundingBox())!;
  const mono = (await page
    .getByRole('menuitem', { name: 'Mono' })
    .boundingBox())!;
  // Down and left, across Mute.
  await sweep(
    page,
    { x: row.x + row.width / 2, y: row.y + row.height / 2 },
    { x: mono.x + mono.width / 2, y: mono.y + mono.height / 2 },
  );
  await expect(submenu).toBeVisible();
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByText('Last action: Mono')).toBeVisible();
});

test('a long submenu is held to the editor and scrolls', async ({ page }) => {
  await page.getByRole('button', { name: 'Filter' }).click();
  const trigger = page.getByRole('menuitem', { name: 'Key tracking root' });
  await trigger.click();
  const submenu = page.getByRole('menu', { name: 'Key tracking root' });
  await expect(submenu).toBeVisible();
  const at = (await submenu.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(at.y + at.height).toBeLessThanOrEqual(viewport.height);
  // The keyboard reaches its last row, which is brought into view.
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'C1' })).toBeFocused();
  await page.keyboard.press('End');
  const last = page.getByRole('menuitem', { name: 'B5' });
  await expect(last).toBeFocused();
  await expect(last).toBeInViewport();
});

test('two levels: → and ← go in and out, a choice closes everything', async ({
  page,
}) => {
  const button = page.getByRole('button', { name: 'Filter' });
  await button.click();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Shape' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'Analog' })).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: '6 dB/oct' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('menu', { name: 'Slope' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Slope' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(page.getByText('24 dB/oct', { exact: false })).toBeVisible();
  await expect(button).toBeFocused();
});

test('a press outside closes every menu', async ({ page }) => {
  const trigger = await openBand(page);
  await trigger.click();
  await expect(page.getByRole('menu')).toHaveCount(2);
  // In the editor, above the buttons: outside both menus.
  const band = (await page
    .getByRole('button', { name: 'Band' })
    .boundingBox())!;
  await page.mouse.click(band.x + 4, band.y - 60);
  await expect(page.getByRole('menu')).toHaveCount(0);
});

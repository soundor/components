import { expect, test } from '@playwright/test';

import { centreOf, dragBy, openDemo } from './demo';

// The parametric EQ demo: three draggable bands over an area and its curves.
test.beforeEach(async ({ page }) => {
  await openDemo(page, 'plot-eq');
});

test('each band is a marker that a drag moves, and Esc puts back', async ({
  page,
}) => {
  for (const name of ['1', '2', '3'])
    await expect(page.getByRole('slider', { name, exact: true })).toBeVisible();
  const band = page.getByRole('slider', { name: '2', exact: true });
  const before = await band.getAttribute('aria-valuetext');
  await dragBy(page, await centreOf(band), 30, -20);
  await expect(band).not.toHaveAttribute('aria-valuetext', before!);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(band).toHaveAttribute('aria-valuetext', before!);

  await dragBy(page, await centreOf(band), 30, -20);
  await page.mouse.up();
  await expect(band).not.toHaveAttribute('aria-valuetext', before!);
});

test('a marker takes the arrow keys once clicked', async ({ page }) => {
  const band = page.getByRole('slider', { name: '1', exact: true });
  await band.click();
  const before = await band.getAttribute('aria-valuetext');
  await page.keyboard.press('ArrowUp');
  await expect(band).not.toHaveAttribute('aria-valuetext', before!);
});

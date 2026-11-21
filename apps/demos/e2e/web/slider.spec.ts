import { expect, test } from '@playwright/test';

import { openDemo, valueOf } from './demo';

// The slider demo: Mix, 0 to 1 with a default of 0.5, 220 pixels wide.
test.beforeEach(async ({ page }) => {
  await openDemo(page, 'slider');
});

test('a press on the track jumps there', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Mix' });
  const box = (await slider.boundingBox())!;
  await slider.click({ position: { x: box.width * 0.9, y: box.height / 2 } });
  expect(await valueOf(slider)).toBeCloseTo(0.9, 1);
});

test('a double-click away from the thumb jumps, and resets nothing', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Mix' });
  const box = (await slider.boundingBox())!;
  await slider.dblclick({
    position: { x: box.width * 0.1, y: box.height / 2 },
  });
  expect(await valueOf(slider)).toBeCloseTo(0.1, 1);
});

test('a double-click on the thumb resets it', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Mix' });
  const box = (await slider.boundingBox())!;
  const at = { x: box.width * 0.9, y: box.height / 2 };
  await slider.click({ position: at });
  expect(await valueOf(slider)).toBeCloseTo(0.9, 1);
  // The thumb is where that press put it.
  await slider.dblclick({ position: at });
  await expect(slider).toHaveAttribute('aria-valuenow', '0.5');
});

test('a drag from the thumb keeps the grab offset', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Mix' });
  const box = (await slider.boundingBox())!;
  const y = box.y + box.height / 2;
  // Just beside the thumb's centre, within its grab radius.
  await page.mouse.move(box.x + box.width / 2 + 3, y);
  await page.mouse.down();
  expect(await valueOf(slider)).toBe(0.5);
  await page.mouse.move(box.x + box.width * 0.75 + 3, y, { steps: 8 });
  await page.mouse.up();
  expect(await valueOf(slider)).toBeCloseTo(0.75, 1);
});

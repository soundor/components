import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('shows standalone and aligned pitch references when the plot domain changes', async ({
  page,
}) => {
  await openDemo(page, 'frequency-keyboard');
  const keyboards = page.getByRole('img', { name: 'Musical pitch keyboard' });
  await expect(keyboards).toHaveCount(2);
  const aligned = await keyboards.first().boundingBox();
  const plot = await page
    .getByRole('img', { name: 'Pitch scale with a guide at 440 Hz' })
    .boundingBox();
  expect(aligned!.x).toBeGreaterThan(plot!.x);
  expect(aligned!.x + aligned!.width).toBeLessThan(plot!.x + plot!.width);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();
  await expect(keyboards).toHaveCount(2);
});

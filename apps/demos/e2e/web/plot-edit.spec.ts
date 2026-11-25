import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('only a background double-click adds a point and the background menu opens at the pointer', async ({
  page,
}) => {
  await openDemo(page, 'plot-edit');
  const plot = page.getByRole('img', { name: 'Point editor' });
  const box = (await plot.boundingBox())!;
  const marker = page.getByRole('slider', { name: 'Point 1' });
  const markers = page.getByRole('slider', { name: /^Point \d+$/ });
  await marker.dblclick();
  await expect(markers).toHaveCount(1);
  await page.mouse.dblclick(box.x + 104, box.y + 60);
  await expect(markers).toHaveCount(2);
  await page.mouse.click(box.x + 104, box.y + 90, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Clear points' }).click();
  await expect(markers).toHaveCount(0);
});

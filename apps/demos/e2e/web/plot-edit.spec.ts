import { expect, test } from '@playwright/test';

import { openDemo } from './demo';

test('rectangle selection and group drag preserve the spacing between points', async ({
  page,
}) => {
  await openDemo(page, 'plot-edit');
  await page.getByRole('button', { name: 'Add point' }).click();
  const plot = (await page
    .getByRole('img', { name: 'Point editor' })
    .boundingBox())!;
  const first = page.getByRole('slider', { name: 'Point 1' });
  const second = page.getByRole('slider', { name: 'Point 2' });
  const a = (await first.boundingBox())!;
  const b = (await second.boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(plot.x + 75, plot.y + 20);
  await page.mouse.down();
  await page.mouse.move(plot.x + 230, plot.y + 135, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.getByText(/^2 selected/)).toBeVisible();
  const x = a.x + a.width / 2;
  const y = a.y + a.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 21, y, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(async () => (await first.boundingBox())!.x)
    .toBeGreaterThan(a.x + 10);
  expect((await second.boundingBox())!.x - b.x).toBeCloseTo(
    (await first.boundingBox())!.x - a.x,
    0,
  );
});

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

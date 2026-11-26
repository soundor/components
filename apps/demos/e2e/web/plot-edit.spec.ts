import { expect, test } from '@playwright/test';

import { centreOf, openDemo } from './demo';

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
  await page.mouse.move(plot.x + 75, plot.y + 20);
  await page.mouse.down();
  await page.mouse.move(plot.x + 230, plot.y + 135, { steps: 5 });
  await page.mouse.up();
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

  const handle = await centreOf(second);
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(plot.x + plot.width + 40, handle.y);
  await page.mouse.up();
  await expect(first).toHaveAttribute('aria-valuenow', '1');
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
  // Click in the handle padding just above the y = 1 grid line.
  await page.mouse.dblclick(box.x + 104, box.y + 10);
  await expect(markers).toHaveCount(2);
  await expect(page.getByRole('slider', { name: 'Point 2' })).toHaveAttribute(
    'aria-valuetext',
    /Y 1(?:\.0+)?$/,
  );
  await page.mouse.click(box.x + 104, box.y + 90, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Clear points' }).click();
  await expect(markers).toHaveCount(0);
});

test('rectangle replaces, adds and toggles from a stable snapshot in either direction', async ({
  page,
}) => {
  await openDemo(page, 'plot-edit');
  await page.getByRole('button', { name: 'Add point' }).click();
  const first = page.getByRole('slider', { name: 'Point 1' });
  const second = page.getByRole('slider', { name: 'Point 2' });
  const a = await centreOf(first);
  const b = await centreOf(second);
  const selected = async (one: boolean, two: boolean) => {
    await expect(first).toHaveAttribute('aria-selected', String(one));
    await expect(second).toHaveAttribute('aria-selected', String(two));
  };
  const rect = async (point: { x: number; y: number }, reverse = false) => {
    const d = reverse ? -19 : 19;
    await page.mouse.move(point.x - d, point.y - d);
    await page.mouse.down();
    await page.mouse.move(point.x + d, point.y + d);
    await page.mouse.up();
  };
  await rect(a);
  await selected(true, false);
  await page.keyboard.down('Shift');
  await rect(b, true);
  await page.keyboard.up('Shift');
  await selected(true, true);
  await rect(a);
  await selected(true, false);

  // Primary modifier takes precedence over Shift and stays latched after release.
  await page.keyboard.down('Shift');
  await page.keyboard.down('ControlOrMeta');
  await page.mouse.move(a.x + 20, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(a.x - 19, a.y - 19);
  await selected(false, false);
  await page.keyboard.up('ControlOrMeta');
  await page.keyboard.up('Shift');
  await page.mouse.move(a.x - 21, a.y - 21);
  await selected(false, false);
  await page.mouse.move(a.x + 10, a.y + 10);
  await selected(true, false);
  await page.mouse.move(b.x - 18, b.y - 18);
  await page.mouse.up();
  await selected(false, true);

  const empty = { x: a.x + 64, y: a.y + 12 };
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  await selected(false, true);
  await page.mouse.move(empty.x + 1, empty.y + 1);
  await page.mouse.up();
  await selected(false, false);
  await rect(a);
  await rect(empty);
  await selected(false, false);
});

test('marker clicks add, toggle and collapse, but modified drags do not change selection', async ({
  page,
}) => {
  await openDemo(page, 'plot-edit');
  await page.getByRole('button', { name: 'Add point' }).click();
  const first = page.getByRole('slider', { name: 'Point 1' });
  const second = page.getByRole('slider', { name: 'Point 2' });
  const close = page.getByRole('button', { name: 'Close point controls' });
  const click = async (
    target: typeof first,
    modifiers: ('Shift' | 'ControlOrMeta')[] = [],
  ) => {
    await target.click({ modifiers });
    await close.click();
  };
  await click(first);
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await click(second, ['Shift']);
  await click(second, ['Shift']);
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await click(first);
  await expect(second).toHaveAttribute('aria-selected', 'false');
  await click(first, ['Shift', 'ControlOrMeta']);
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await click(second, ['ControlOrMeta']);
  await expect(second).toHaveAttribute('aria-selected', 'true');

  const { x, y } = await centreOf(first);
  await page.keyboard.down('Shift');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 20);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect
    .poll(async () => (await centreOf(first)).x)
    .toBeCloseTo(x + 4, 0);
  expect((await centreOf(first)).y).toBeCloseTo(y, 0);
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(close).toHaveCount(0);
  await page.mouse.move(x + 4, y);
  await page.mouse.down();
  await page.mouse.move(x + 34, y);
  await page.mouse.up();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(second).toHaveAttribute('aria-selected', 'false');
});

test('touch rectangle selection restores the snapshot on cancellation', async ({
  page,
  context,
}) => {
  await openDemo(page, 'plot-edit');
  const first = page.getByRole('slider', { name: 'Point 1' });
  const { x, y } = await centreOf(first);
  const touch = await context.newCDPSession(page);
  const point = (dx: number, dy: number) => ({ x: x + dx, y: y + dy });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [point(-22, -22)],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [point(22, 22)],
  });
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  });
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [point(22, 22)],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [point(-22, -22)],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(first).toHaveAttribute('aria-selected', 'true');
});

test('losing capture cancels selection, and an overlay owns its own drags', async ({
  page,
}) => {
  await openDemo(page, 'plot-edit');
  const first = page.getByRole('slider', { name: 'Point 1' });
  const { x, y } = await centreOf(first);
  await page.mouse.move(x - 24, y - 24);
  await page.mouse.down();
  await page.mouse.move(x + 24, y + 24);
  await expect(first).toHaveAttribute('aria-selected', 'true');
  // Soundor captures on its native root. Report loss before the eventual release.
  await page.evaluate(() =>
    window.dispatchEvent(
      new PointerEvent('lostpointercapture', { pointerId: 1 }),
    ),
  );
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await page.mouse.up();

  await first.click();
  const overlay = page.getByRole('dialog', { name: 'Point controls' });
  const origin = await centreOf(overlay);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 30);
  await page.mouse.up();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(overlay).toBeVisible();
});

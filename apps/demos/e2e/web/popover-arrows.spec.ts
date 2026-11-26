import { expect, test, type Locator } from '@playwright/test';

import { openDemo } from './demo';

test.use({ viewport: { width: 430, height: 420 } });

async function box(locator: Locator) {
  const measured = await locator.boundingBox();
  if (!measured) throw new Error('Expected a laid-out node');
  return measured;
}

const cases = [
  ['Top', 'top'],
  ['Bottom', 'bottom'],
  ['Left', 'left'],
  ['Right', 'right'],
  ['Flip at top edge', 'bottom'],
  ['Shift', 'top'],
] as const;

for (const [label, side] of cases) {
  test(`${label}: the arrow joins the ${side} surface to the anchor`, async ({
    page,
  }) => {
    await openDemo(page, 'popover-arrows');
    const trigger = page.getByRole('button', { name: label, exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: `${label} example` });
    const arrow = page.locator('[data-soundor-debug-id="popover-arrow"]');
    await expect(arrow).toBeVisible();
    await expect(arrow).toHaveAttribute('aria-hidden', 'true');
    await expect(arrow).toHaveCSS('pointer-events', 'none');
    const [a, s, p] = await Promise.all([
      box(trigger),
      box(dialog),
      box(arrow),
    ]);
    const scale = s.width / 156;
    const [tip, anchorEdge, base, surfaceEdge, crossError] = {
      top: [
        p.y + p.height,
        a.y,
        p.y,
        s.y + s.height,
        p.x + p.width / 2 - (a.x + a.width / 2),
      ],
      bottom: [
        p.y,
        a.y + a.height,
        p.y + p.height,
        s.y,
        p.x + p.width / 2 - (a.x + a.width / 2),
      ],
      left: [
        p.x + p.width,
        a.x,
        p.x,
        s.x + s.width,
        p.y + p.height / 2 - (a.y + a.height / 2),
      ],
      right: [
        p.x,
        a.x + a.width,
        p.x + p.width,
        s.x,
        p.y + p.height / 2 - (a.y + a.height / 2),
      ],
    }[side];
    const direction = side === 'top' || side === 'left' ? 1 : -1;
    expect(Math.abs(crossError)).toBeLessThan(1);
    expect(Math.abs(base - surfaceEdge)).toBeLessThan(1.5);
    expect(Math.abs((anchorEdge - tip) * direction - 4 * scale)).toBeLessThan(
      1,
    );
    if (label === 'Top') {
      expect(Math.abs(p.x + p.width / 2 - (s.x + s.width / 2))).toBeLessThan(1);
      await page.getByRole('button', { name: 'Hide arrow' }).click();
      await expect(arrow).toHaveCount(0);
      const without = await box(dialog);
      expect(
        Math.abs(a.y - (without.y + without.height) - 4 * scale),
      ).toBeLessThan(1);
      await page.getByRole('button', { name: 'Show arrow' }).click();
      await expect(arrow).toBeVisible();
    }
    if (label === 'Shift') {
      expect(Math.abs(p.x + p.width / 2 - (s.x + s.width / 2))).toBeGreaterThan(
        6,
      );
    }
  });
}

test('an arrow stops at the rounded corner if the anchor is nearer the edge', async ({
  page,
}) => {
  await openDemo(page, 'popover-arrows');
  const trigger = page.getByRole('button', { name: 'Edge', exact: true });
  await trigger.click();
  const arrow = page.locator('[data-soundor-debug-id="popover-arrow"]');
  await expect(arrow).toBeVisible();
  const [a, s, p] = await Promise.all([
    box(trigger),
    box(page.getByRole('dialog', { name: 'Edge example' })),
    box(arrow),
  ]);
  expect(p.x + p.width / 2).toBeGreaterThan(a.x + a.width / 2 + 1);
  expect(Math.abs(p.x - s.x - 30 * (s.width / 156))).toBeLessThan(1);
});

import { expect, test } from '@playwright/test';

import { centreOf, dragBy, openDemo } from './demo';

// The XY pad demo: Cutoff at 50%, Resonance at 30%.
const initial = 'Cutoff 50%, Resonance 30%';

test.beforeEach(async ({ page }) => {
  await openDemo(page, 'xy-pad');
});

test('a drag moves both values', async ({ page }) => {
  const pad = page.getByRole('slider', { name: 'Filter' });
  await dragBy(page, await centreOf(pad), 40, -30);
  await page.mouse.up();
  await expect(pad).not.toHaveAttribute('aria-valuetext', initial);
});

test('Esc during a drag restores both values', async ({ page }) => {
  const pad = page.getByRole('slider', { name: 'Filter' });
  await dragBy(page, await centreOf(pad), 40, -30);
  await expect(pad).not.toHaveAttribute('aria-valuetext', initial);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(pad).toHaveAttribute('aria-valuetext', initial);
});

test('an Alt-click resets both axes to their defaults', async ({ page }) => {
  const pad = page.getByRole('slider', { name: 'Filter' });
  await pad.click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await expect(pad).not.toHaveAttribute('aria-valuetext', initial);
  await pad.click({ modifiers: ['Alt'] });
  // The demo gives no defaultValue: each axis's default is its middle.
  await expect(pad).toHaveAttribute(
    'aria-valuetext',
    'Cutoff 50%, Resonance 50%',
  );
});

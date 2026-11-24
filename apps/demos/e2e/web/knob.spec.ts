import { expect, test, type Locator } from '@playwright/test';

import { centreOf, dragBy, openDemo, valueOf } from './demo';

// The knob demo: Feedback is bound to a parameter whose default is 40%.
test.beforeEach(async ({ page }) => {
  await openDemo(page, 'knob');
});

test('a drag up raises the value, and the release keeps it', async ({
  page,
}) => {
  const knob = page.getByRole('slider', { name: 'Feedback' });
  await dragBy(page, await centreOf(knob), 0, -60);
  await page.mouse.up();
  expect(await valueOf(knob)).toBeGreaterThan(0.45);
});

test('Esc during a drag restores the value from before it', async ({
  page,
}) => {
  const knob = page.getByRole('slider', { name: 'Feedback' });
  await dragBy(page, await centreOf(knob), 0, -60);
  expect(await valueOf(knob)).toBeGreaterThan(0.45);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(knob).toHaveAttribute('aria-valuetext', '40%');
});

test('the wheel changes the value', async ({ page }) => {
  const knob = page.getByRole('slider', { name: 'Feedback' });
  const { x, y } = await centreOf(knob);
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => valueOf(knob)).toBeGreaterThan(0.4);
});

test('keys go to the knob a click focused', async ({ page }) => {
  const knob = page.getByRole('slider', { name: 'Feedback' });
  await knob.click();
  await page.keyboard.press('End');
  await expect(knob).toHaveAttribute('aria-valuetext', '100%');
  await page.keyboard.press('Home');
  await expect(knob).toHaveAttribute('aria-valuetext', '0%');
});

test('a disabled knob takes neither focus nor pointer or wheel edits', async ({
  page,
}) => {
  const knob = page.getByRole('slider', { name: 'Disabled' });
  await expect(knob).toBeDisabled();
  await dragBy(page, await centreOf(knob), 0, -40);
  await page.mouse.up();
  await expect(knob).not.toBeFocused();
  await knob.hover();
  await page.mouse.wheel(0, -100);
  await expect(knob).toHaveAttribute('aria-valuetext', '40%');
});

for (const [name, reset] of [
  ['a double-click', (knob) => knob.dblclick()],
  ['an Alt-click', (knob) => knob.click({ modifiers: ['Alt'] })],
  ['Delete', (knob) => knob.press('Delete')],
  ['Backspace', (knob) => knob.press('Backspace')],
] as const satisfies readonly (readonly [
  string,
  (knob: Locator) => Promise<void>,
])[]) {
  test(`${name} resets to the default`, async ({ page }) => {
    const knob = page.getByRole('slider', { name: 'Feedback' });
    await knob.click();
    await page.keyboard.press('End');
    await expect(knob).toHaveAttribute('aria-valuetext', '100%');
    await reset(knob);
    await expect(knob).toHaveAttribute('aria-valuetext', '40%');
  });
}

// Once focus is in the plugin, as a click puts it there: from the page, Tab
// goes through the web host's toolbar only, and never into the plugin.
test('Tab moves between the knobs in the order they are drawn, and wraps', async ({
  page,
}) => {
  const feedback = page.getByRole('slider', { name: 'Feedback' });
  const standalone = page.getByRole('slider', { name: 'Standalone' });
  await feedback.click();
  await page.keyboard.press('Tab');
  await expect(standalone).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(feedback).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(standalone).toBeFocused();
});

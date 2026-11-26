import { expect, test } from '@playwright/test';

import { centreOf, openDemo } from './demo';

for (const [label, dx, dy, expected] of [
  ['Value field', 0, -20, 35],
  ['Knob', 0, -16, 35],
  ['Fader', 0, -20, undefined],
  ['Slider', 16, 0, undefined],
] as const) {
  test(`${label} drags from the default instead of the backing value`, async ({
    page,
  }) => {
    await openDemo(page, 'mixed-values');
    const slider = page
      .getByRole('slider', { name: label, exact: true })
      .nth(1);
    await expect(slider).toHaveAttribute('aria-valuetext', 'Mixed');
    await expect(slider).not.toHaveAttribute('aria-valuenow');
    const from = await centreOf(slider);
    const box = (await slider.boundingBox())!;
    if (label === 'Slider') from.x = box.x + 12; // Far from the neutral cap.
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await expect(slider).toHaveAttribute('aria-valuetext', 'Mixed');
    await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
    await page.mouse.up();
    const now = Number(await slider.getAttribute('aria-valuenow'));
    const delta =
      label === 'Fader' ? -dy / (box.height - 44) : dx / (box.width - 12);
    expect(now).toBeCloseTo(expected ?? 25 + delta * 100);
  });
}

test('mixed choice controls expose their indeterminate state in the browser', async ({
  page,
}) => {
  await openDemo(page, 'mixed-values');
  for (const name of ['Button', 'Chip', 'Switch']) {
    const toggle = page.getByRole('checkbox', { name, exact: true });
    await expect(toggle).toHaveAttribute('aria-checked', 'mixed');
    await toggle.click();
    const normal = page
      .getByRole(name === 'Switch' ? 'switch' : 'button', { name, exact: true })
      .last();
    await expect(normal).toBeVisible();
  }
  const group = page.getByRole('radiogroup', { name: 'Shape' }).nth(1);
  await expect(group).toHaveAccessibleDescription('Mixed');
  const bell = group.getByRole('radio', { name: 'Bell' });
  await expect(bell).toHaveAttribute('aria-checked', 'false');
  await bell.click();
  await expect(bell).toHaveAttribute('aria-checked', 'true');

  const select = page.getByRole('combobox', { name: 'Filter type' }).nth(1);
  await expect(select).toHaveAttribute('aria-valuetext', 'Mixed');
  await select.click();
  const option = page.getByRole('menuitem', { name: 'Bell' });
  await expect(option).not.toHaveAttribute('aria-checked', 'true');
  await option.click();
  await expect(select).toHaveAttribute('aria-valuetext', 'Bell');
});

import { expect, type Locator, type Page } from '@playwright/test';

/** Opens one demo (a file of src/demos) and waits for its UI. */
export async function openDemo(page: Page, name: string): Promise<void> {
  await page.goto(`/?demo=${name}`);
  await expect(page.getByRole('toolbar', { name: 'Host' })).toBeVisible();
}

/** A control's value, as assistive technology reads it. */
export async function valueOf(control: Locator): Promise<number> {
  return Number(await control.getAttribute('aria-valuenow'));
}

/** The middle of a control, in page coordinates. */
export async function centreOf(
  control: Locator,
): Promise<{ x: number; y: number }> {
  const box = await control.boundingBox();
  if (!box) throw new Error('The control is not laid out');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Presses at a point and moves by (dx, dy) in steps, still held. */
export async function dragBy(
  page: Page,
  from: { x: number; y: number },
  dx: number,
  dy: number,
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
}

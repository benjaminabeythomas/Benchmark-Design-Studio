import { test, expect } from '@playwright/test';

test('renders interactive design studio and applies scene edits', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('DESIGN STUDIO').first()).toBeVisible();
  await expect(page.locator('#scene canvas')).toBeVisible();
  await page.locator('#prompt').fill('walnut cabinets');
  await page.getByRole('button', { name: 'Apply to 3D scene' }).click();
  await expect(page.locator('#message')).toContainText('walnut');
  await page.getByRole('button', { name: 'Bathroom' }).click();
  await expect(page.locator('#message')).toContainText('bathroom');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('#message')).toContainText('Undone');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  await expect(page.locator('#message')).toContainText('exported');
  await page.screenshot({ path: 'test-results/studio-preview.png', fullPage: true });
  expect(errors).toEqual([]);
});

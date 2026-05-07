import { expect, test } from '@playwright/test';

test.describe('Admin authentication gates', () => {
  test('unauthenticated user is redirected from /admin to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected from admin child routes to /login', async ({ page }) => {
    await page.goto('/admin/promotions');
    await expect(page).toHaveURL(/\/login/);
  });
});

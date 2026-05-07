import { expect, test, type Page } from '@playwright/test';
import { cleanupQaData, seedQaData, type QaSeed } from './support/qa-seed';

test.describe('QA-seeded admin portal flow', () => {
  let seed: QaSeed | null = null;

  test.skip(process.env.RUN_FULL_E2E !== '1', 'Set RUN_FULL_E2E=1 with Supabase service-role envs to run seeded admin E2E.');

  test.beforeAll(async () => {
    seed = await seedQaData();
  });

  test.afterAll(async () => {
    await cleanupQaData(seed);
  });

  test('admin dashboard, property context, review flow, and account approval are connected', async ({ page }) => {
    if (!seed) throw new Error('QA seed did not initialize');

    await login(page, seed.admin.email, seed.admin.password);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: 'Admin Overview' })).toBeVisible({ timeout: 20_000 });

    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Review Queue' })).toHaveAttribute(
      'href',
      `/admin/advertisers?propertyId=${seed.propertyId}`
    );
    await expect(nav.getByRole('link', { name: 'Promotion Library' })).toHaveAttribute(
      'href',
      `/admin/promotions?propertyId=${seed.propertyId}`
    );

    await page.getByText('Promotions 30d').click();
    await expect(page).toHaveURL(new RegExp(`/admin/advertisers\\?propertyId=${seed.propertyId}.*filter=Approved.*window=recent`));
    await expect(page.getByText(`QA Recent Approved ${seed.qaRunId}`)).toBeVisible();
    await expect(page.getByText(`QA Old Approved ${seed.qaRunId}`)).toHaveCount(0);

    await page.goto(`/admin/advertisers?propertyId=${seed.propertyId}&filter=Pending`);
    await page.getByText(`QA Pending Review ${seed.qaRunId}`).click();
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.locator('span.unit-status', { hasText: 'approved' })).toBeVisible();

    await page.goto('/admin/advertiser-accounts?status=pending');
    await expect(page.getByText(`QA Advertiser ${seed.qaRunId}`)).toBeVisible();
    await page.getByRole('button', { name: `Approve QA Advertiser ${seed.qaRunId}` }).click();
    await expect(page.getByRole('button', { name: `Approve QA Advertiser ${seed.qaRunId}` })).toHaveCount(0);
    await page.getByRole('button', { name: 'Active' }).click();
    await expect(page.getByText(`QA Advertiser ${seed.qaRunId}`)).toBeVisible();
  });
});

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

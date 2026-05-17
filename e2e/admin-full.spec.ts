import { expect, test, type Page } from '@playwright/test';
import { cleanupQaData, seedQaData, type QaSeed } from './support/qa-seed';

test.describe('QA-seeded admin portal flow', () => {
  test.describe.configure({ mode: 'serial' });

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

  test('active advertiser can create a promotion and reach Stripe Checkout', async ({ page }) => {
    if (!seed) throw new Error('QA seed did not initialize');

    await login(page, seed.activeAdvertiser.email, seed.activeAdvertiser.password);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/promotions/new');
    await expect(page.getByRole('heading', { name: 'New Promotion' })).toBeVisible();

    const headline = `QA Portal Checkout ${seed.qaRunId}`;
    const { startDate, endDate } = checkoutWindow();

    await page.getByLabel('Headline *').fill(headline);
    await page.getByLabel('Description (optional)').fill(`Seeded advertiser checkout flow for ${seed.qaRunId}`);
    await page.getByLabel('CTA Text (optional)').fill('Learn More');
    await page.getByLabel('CTA URL (optional)').fill('https://example.com/unit-qa');
    await page.getByLabel('Property *').selectOption(seed.propertyId);
    await page.getByLabel('Start Date *').fill(startDate);
    await page.getByLabel('End Date *').fill(endDate);
    await page.getByRole('button', { name: 'Continue To Review & Pay' }).click();

    await expect(page).toHaveURL(/\/promotions\/new\/review\?id=/);
    await expect(page.getByText(headline)).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`QA Tier ${seed.qaRunId}`) }).click();
    await page.getByRole('button', { name: /Pay \$12\.34 with Stripe/ }).click();

    await page.waitForURL(/https:\/\/checkout\.stripe\.com\//, { timeout: 30_000 });
  });
});

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

function checkoutWindow(): { startDate: string; endDate: string } {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LANDLORD_EMAIL = process.env.TEST_LANDLORD_EMAIL || 'landlord@example.com';

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing env vars: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n' +
      'Run: SUPABASE_SERVICE_ROLE_KEY=<key> npx playwright test'
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('Landlord Magic Link Login', () => {
  test('full login flow: send magic link → land on dashboard with property data', async ({ page }) => {
    // ── Step 1: Go to /LandlordLogin ──
    await page.goto('/LandlordLogin');
    await expect(page.getByRole('heading', { name: 'Landlord Access' })).toBeVisible();

    // ── Step 2: Enter landlord email ──
    await page.getByLabel('Email address').fill(LANDLORD_EMAIL);

    // ── Step 3: Click "Send Magic Link" ──
    await page.getByRole('button', { name: 'Send Magic Link' }).click();

    // Verify confirmation screen appears
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText(`We sent a sign-in link to ${LANDLORD_EMAIL}`)).toBeVisible();

    // ── Step 4: Generate magic link via Admin API (replaces "click link in inbox") ──
    const admin = getAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: LANDLORD_EMAIL,
      options: {
        redirectTo: `${page.url().split('/LandlordLogin')[0]}/LandlordDashboard`,
      },
    });

    if (error) throw new Error(`Failed to generate magic link: ${error.message}`);

    // The admin API returns the full verification URL with token
    const magicLinkUrl = data.properties.action_link;
    expect(magicLinkUrl).toBeTruthy();

    // Navigate to the magic link — this completes auth and redirects to dashboard
    await page.goto(magicLinkUrl);

    // ── Step 5: Verify we land on /LandlordDashboard with property data ──
    await page.waitForURL('**/LandlordDashboard**', { timeout: 15000 });

    // Dashboard heading with property name should be visible (loading spinner gone)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Key metrics are rendered — confirms property data loaded
    await expect(page.getByText('Occupancy')).toBeVisible();
    await expect(page.getByText('Tenants')).toBeVisible();
    await expect(page.getByText('Monthly Revenue')).toBeVisible();

    // Logout button present confirms authenticated session
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test'

test.describe('Authentication gates', () => {
  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected from /promotions to /login', async ({ page }) => {
    await page.goto('/promotions')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders without error', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('form')).toBeVisible()
  })
})

test.describe('Checkout flow (smoke)', () => {
  test('success page requires a session_id param', async ({ page }) => {
    // Without session_id, success page should redirect or show error
    const res = await page.goto('/success')
    // Should not return 500
    expect(res?.status()).not.toBe(500)
  })
})

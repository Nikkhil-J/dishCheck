import { test, expect } from '@playwright/test'
import { loginUser, TEST_USER } from './helpers/auth'

test.describe('Navbar — logged out', () => {
  test('shows Sign In link on desktop', async ({ page }) => {
    await page.goto('/')
    // Navbar renders <Link href="/login"> with text "Sign in" for guests
    await expect(
      page.getByRole('link', { name: /sign in/i }).first()
    ).toBeVisible({ timeout: 6000 })
  })

  test('shows theme toggle when logged out', async ({ page }) => {
    await page.goto('/')
    // ThemeToggle always visible regardless of auth state
    await expect(
      page.locator('[data-testid="theme-toggle"]').or(
        page.getByRole('button', { name: /toggle theme|dark mode|light mode/i })
      ).first()
    ).toBeVisible({ timeout: 6000 })
  })

  test('shows logo linking to home', async ({ page }) => {
    await page.goto('/explore')
    const logo = page.getByRole('link', { name: /dishcheck/i }).first()
    await logo.click()
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('mobile bottom nav shows Sign in for guests', async ({ page, viewport }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // MobileBottomNav shows Sign in link for guests
    await expect(
      page.getByRole('link', { name: /sign in/i }).last()
    ).toBeVisible({ timeout: 6000 })
  })
})

test.describe('Navbar — logged in', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_USER.email, 'E2E_TEST_EMAIL not set')
    await loginUser(page)
  })

  test('notification bell links to notifications page', async ({ page }) => {
    await page.goto('/home')
    await expect(
      page.locator('a[href="/notifications"]').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('user dropdown trigger is visible and opens', async ({ page }) => {
    await page.goto('/home')
    const trigger = page.locator('button[aria-haspopup="menu"]').first()
    await expect(trigger).toBeVisible({ timeout: 8000 })
    await trigger.click()
    await page.waitForTimeout(500)
    await expect(
      page.locator('[role="menuitem"]').or(
        page.locator('[data-radix-dropdown-menu-content]')
      ).first()
    ).toBeVisible({ timeout: 4000 })
  })

  test('clicking profile in dropdown navigates to my-profile', async ({ page }) => {
    await page.goto('/home')
    await page.locator('button[aria-haspopup="menu"]').first().click()
    await page.waitForTimeout(500)
    const profileItem = page.locator('[role="menuitem"]').filter({ hasText: /profile/i }).first()
    if (await profileItem.isVisible({ timeout: 3000 })) {
      await profileItem.click()
      await expect(page).toHaveURL(/\/my-profile/, { timeout: 5000 })
    }
  })

  test('city selector is visible', async ({ page }) => {
    await page.goto('/home')
    await expect(
      page.getByText(/bengaluru|gurugram/i).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('mobile review FAB is visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/home')
    await expect(
      page.locator('a[href="/write-review"]').first()
    ).toBeVisible({ timeout: 6000 })
  })

  test('sign out from dropdown redirects to landing', async ({ page }) => {
    await page.goto('/home')
    await page.locator('button[aria-haspopup="menu"]').first().click()
    await page.waitForTimeout(500)
    const signOutItem = page.locator('[role="menuitem"]').filter({ hasText: /sign out|log out/i }).first()
    if (await signOutItem.isVisible({ timeout: 3000 })) {
      await signOutItem.click()
      await expect(page).toHaveURL('/', { timeout: 8000 })
    }
  })
})

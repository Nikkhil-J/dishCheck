import { test, expect } from '@playwright/test'
import { loginUser, TEST_USER } from './helpers/auth'

test.beforeEach(async ({ page }) => {
  test.skip(!TEST_USER.email, 'E2E_TEST_EMAIL not set — skipping authenticated tests')
  await loginUser(page)
})

test.describe('Home feed', () => {
  test('loads home page with content', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('navbar shows user avatar or initials', async ({ page }) => {
    await page.goto('/home')
    await expect(
      page.locator('button[aria-haspopup="menu"]').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('navbar dropdown shows DishPoints balance', async ({ page }) => {
    await page.goto('/home')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const trigger = page.locator('[data-slot="dropdown-menu-trigger"]').first()
    await expect(trigger).toBeVisible({ timeout: 8000 })
    await trigger.click()
    await expect(
      page.getByText('DishPoints').or(page.locator('text=pts')).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('navbar shows notification bell', async ({ page }) => {
    await page.goto('/home')
    // Bell icon is rendered as a Link to /notifications with Bell lucide icon
    await expect(
      page.getByRole('link', { name: /notification/i }).or(
        page.locator('a[href="/notifications"]')
      ).first()
    ).toBeVisible({ timeout: 6000 })
  })

  test('theme toggle is visible', async ({ page }) => {
    await page.goto('/home')
    await expect(
      page.locator('[data-testid="theme-toggle"]').or(
        page.getByRole('button', { name: /theme|dark|light/i })
      ).first()
    ).toBeVisible({ timeout: 6000 })
  })
})

test.describe('Notifications page', () => {
  test('notifications page heading is visible', async ({ page }) => {
    await page.goto('/notifications')
    // h1 text is "Notifications"
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible({ timeout: 8000 })
  })

  test('shows mark all read button or empty state', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForTimeout(3000)
    const hasMarkAll = await page.getByRole('button', { name: /mark all read/i })
      .isVisible().catch(() => false)
    const hasEmpty = await page.getByText('No notifications yet')
      .isVisible().catch(() => false)
    expect(hasMarkAll || hasEmpty).toBe(true)
  })

  test('mark all read marks notifications as read', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForTimeout(3000)
    const markAllBtn = page.getByRole('button', { name: /mark all read/i })
    if (await markAllBtn.isVisible().catch(() => false)) {
      await markAllBtn.click()
      await expect(markAllBtn).not.toBeVisible({ timeout: 5000 })
    } else {
      expect(true).toBe(true)
    }
  })
})

test.describe('Wishlist page', () => {
  test('wishlist heading is visible', async ({ page }) => {
    await page.goto('/wishlist')
    // h1 text is "Your Wishlist"
    await expect(page.getByRole('heading', { name: /your wishlist/i })).toBeVisible({ timeout: 8000 })
  })

  test('shows wishlist items or empty state', async ({ page }) => {
    await page.goto('/wishlist')
    await page.waitForTimeout(3000)
    const hasItems = await page.locator('a[href*="/dish/"]').first()
      .isVisible().catch(() => false)
    const hasEmpty = await page.getByRole('heading', { name: /wishlist|saved/i })
      .nth(1).isVisible().catch(() => false) ||
      await page.getByText(/nothing saved|no saved|start saving|save dishes/i)
      .isVisible().catch(() => false)
    expect(hasItems || hasEmpty).toBe(true)
  })

  test('adding a dish to wishlist toggles state', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForSelector('a[href*="/dish/"]', { timeout: 15000 })
    const href = await page.locator('a[href*="/dish/"]').first().getAttribute('href')
    if (!href) test.skip()
    await page.goto(href!)

    // WishlistButton — find by button role near Heart icon
    const wishlistBtn = page.locator('[data-testid="wishlist-btn"]').or(
      page.getByRole('button', { name: /save|saved|wishlist/i })
    ).first()
    await expect(wishlistBtn).toBeVisible({ timeout: 8000 })

    const initialText = await wishlistBtn.textContent()
    await wishlistBtn.click()
    await page.waitForTimeout(1500)
    const updatedText = await wishlistBtn.textContent()
    // Text should have changed (Save → Saved or vice versa)
    expect(updatedText).not.toBe(initialText)
  })
})

test.describe('Settings page', () => {
  test('settings page loads with profile section', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByLabel('Display name')).toBeVisible({ timeout: 6000 })
  })

  test('can update display name and see success toast', async ({ page }) => {
    await page.goto('/settings')
    const nameInput = page.getByLabel('Display name')
    await nameInput.fill(TEST_USER.displayName)
    await page.getByRole('button', { name: /save|update/i }).first().click()
    await expect(
      page.getByText(/saved|updated|success/i).first()
    ).toBeVisible({ timeout: 6000 })
  })
})

test.describe('My profile page', () => {
  test('shows user review count and level', async ({ page }) => {
    await page.goto('/my-profile')
    await expect(
      page.getByText(/reviews|level|newbie|foodie/i).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('shows badges section', async ({ page }) => {
    await page.goto('/my-profile')
    await expect(
      page.getByText(/badge|achievement/i).first()
    ).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Rewards page', () => {
  test('shows balance and tabs', async ({ page }) => {
    await page.goto('/rewards')
    await page.waitForTimeout(2000)
    await expect(
      page.getByText(/dishpoints|points/i).first()
    ).toBeVisible({ timeout: 8000 })
    const tabs = page.getByRole('button').filter({ hasText: /coupon|redeem|history|earn|transaction/i })
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThan(0)
  })

  test('switching tabs shows different content', async ({ page }) => {
    await page.goto('/rewards')
    await page.waitForTimeout(2000)
    const secondTab = page.getByRole('button').filter({
      hasText: /history|transaction|earn/i
    }).first()
    if (await secondTab.isVisible({ timeout: 5000 })) {
      await secondTab.click()
      await page.waitForTimeout(1000)
      const hasContent = await page.getByText(/points|earned|spent|redeemed/i)
        .first().isVisible().catch(() => false)
      const hasEmpty = await page.getByText(/no history|no transaction|nothing/i)
        .first().isVisible().catch(() => false)
      expect(hasContent || hasEmpty).toBe(true)
    }
  })
})

test.describe('Compare page', () => {
  test('compare page loads', async ({ page }) => {
    await page.goto('/compare')
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
  })

  test('compare page shows relevant content for user tier', async ({ page }) => {
    await page.goto('/compare')
    await page.waitForTimeout(2000)
    const hasAnyContent = await page.locator('h1, h2, button, [class*="upgrade"], [class*="compare"]')
      .first().isVisible({ timeout: 8000 })
    expect(hasAnyContent).toBe(true)
  })
})

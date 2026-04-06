import { test, expect } from '@playwright/test'

test.describe('Dark mode', () => {
  test('theme toggle button exists with aria-label', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Toggle theme' })
    await expect(toggle).toBeVisible({ timeout: 8000 })
    await toggle.click()
    await page.waitForTimeout(300)
    expect(true).toBe(true)
  })

  test('theme persists across navigation', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Toggle theme' })
    await expect(toggle).toBeVisible({ timeout: 8000 })
    await toggle.click()
    await page.waitForTimeout(300)
    const classAfterToggle = await page.locator('html').getAttribute('class') ?? ''
    await page.goto('/explore')
    await page.waitForTimeout(1000)
    const classAfterNav = await page.locator('html').getAttribute('class') ?? ''
    expect(classAfterNav).toBe(classAfterToggle)
  })
})

test.describe('Mobile viewport — 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('landing page renders correctly on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Search for a dish or restaurant...')).toBeVisible({ timeout: 8000 })
  })

  test('mobile bottom nav is visible on mobile', async ({ page }) => {
    await page.goto('/')
    // MobileBottomNav has fixed bottom nav with md:hidden — visible on mobile
    await expect(
      page.locator('nav').filter({ hasText: /explore|sign in/i }).last()
    ).toBeVisible({ timeout: 6000 })
  })

  test('desktop navbar search is hidden on mobile', async ({ page }) => {
    await page.goto('/explore')
    // SearchBar form has class hidden md:block — not visible at 375px
    const desktopSearch = page.locator('form').filter({
      has: page.getByPlaceholder('Search for a dish or restaurant...')
    })
    await expect(desktopSearch).not.toBeVisible()
  })

  test('explore page loads dishes on mobile', async ({ page }) => {
    await page.goto('/explore')
    await expect(
      page.locator('a[href*="/dish/"]').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('dish detail page loads on mobile', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForSelector('a[href*="/dish/"]', { timeout: 15000 })
    const href = await page.locator('a[href*="/dish/"]').first().getAttribute('href')
    if (!href) test.skip()
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8000 })
  })

  test('protected routes redirect to login on mobile', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})

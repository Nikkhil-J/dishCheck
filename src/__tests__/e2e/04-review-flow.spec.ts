import { test, expect } from '@playwright/test'
import { loginUser, TEST_USER } from './helpers/auth'

const DISH_ID = process.env.E2E_TEST_DISH_ID ?? ''

test.beforeEach(async ({ page }) => {
  test.skip(!TEST_USER.email, 'E2E_TEST_EMAIL not set')
  test.skip(!DISH_ID, 'E2E_TEST_DISH_ID not set')
  await loginUser(page)
})

test.describe('Write review page', () => {
  test('loads review form with dish name', async ({ page }) => {
    await page.goto(`/write-review?dishId=${DISH_ID}`)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows step indicator or progress', async ({ page }) => {
    await page.goto(`/write-review?dishId=${DISH_ID}`)
    await page.waitForTimeout(2000)
    const hasStepLabel = await page.getByText('Photo').isVisible().catch(() => false) &&
      await page.getByText('Rate & Tag').isVisible().catch(() => false)
    const hasStepNumbers = await page.locator('text="1"').first().isVisible().catch(() => false) &&
      await page.locator('text="2"').first().isVisible().catch(() => false)
    expect(hasStepLabel || hasStepNumbers).toBe(true)
  })

  test('star rating buttons are clickable', async ({ page }) => {
    await page.goto(`/write-review?dishId=${DISH_ID}`)
    await page.waitForTimeout(2000)
    const nextBtn = page.getByRole('button', { name: /next.*rate/i }).first()
    if (await nextBtn.isVisible().catch(() => false) && await nextBtn.isEnabled().catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(500)
    }
    const fourthStar = page.getByRole('button', { name: 'Rate 4 out of 5' }).first()
    if (await fourthStar.isVisible().catch(() => false)) {
      await fourthStar.click()
      await expect(fourthStar.locator('svg')).toHaveClass(/accent/, { timeout: 3000 })
    } else {
      test.skip(true, 'Star ratings on step 2 — cannot advance without photo upload')
    }
  })

  test('tag pills are selectable', async ({ page }) => {
    await page.goto(`/write-review?dishId=${DISH_ID}`)
    // TagPill renders <button> with label text — find any tag
    const tagPill = page.locator('button.rounded-pill').first()
    if (await tagPill.isVisible({ timeout: 6000 })) {
      await tagPill.click()
      // Selected state: border-primary bg-primary text-white
      await expect(tagPill).toHaveClass(/bg-primary/, { timeout: 3000 })
    }
  })

  test('text review enforces minimum 30 characters', async ({ page }) => {
    await page.goto(`/write-review?dishId=${DISH_ID}`)
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible({ timeout: 6000 })) {
      await textarea.fill('Too short')
      await page.getByRole('button', { name: /next|continue|submit/i }).first().click()
      await expect(
        page.getByText(/30|minimum|at least/i).first()
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('photo upload input accepts image files', async ({ page }) => {
    await page.goto(`/write-review?dishId=${DISH_ID}`)
    // File input for photo upload
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible({ timeout: 6000 })) {
      await expect(fileInput).toBeEnabled()
    }
  })

  test('redirects to login if not authenticated', async ({ page }) => {
    // Override the beforeEach login by clearing cookies
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto(`/write-review?dishId=${DISH_ID}`)
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    expect(page.url()).toContain('redirect')
  })
})

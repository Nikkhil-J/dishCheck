import { Page } from '@playwright/test'

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL ?? '',
  password: process.env.E2E_TEST_PASSWORD ?? '',
  displayName: process.env.E2E_TEST_DISPLAY_NAME ?? 'E2E Test User',
}

export async function loginUser(page: Page) {
  await page.goto('/login')
  // Login form uses <Label htmlFor="email"> + <Input id="email"> — use getByLabel
  await page.getByLabel(/^email$/i).fill(TEST_USER.email)
  await page.getByLabel(/^password$/i).fill(TEST_USER.password)
  // Use exact button name to avoid matching "Sign in with Google"
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL(/\/(home|explore)/, { timeout: 15000 })
}

export async function logoutUser(page: Page) {
  // Open user dropdown — radix dropdown trigger
  await page.locator('button[aria-haspopup="menu"]').or(
    page.locator('[data-radix-dropdown-menu-trigger]')
  ).first().click()
  await page.getByRole('menuitem', { name: /sign out|log out/i }).click()
  await page.waitForURL('/', { timeout: 8000 })
}

export async function ensureLoggedOut(page: Page) {
  await page.goto('/')
  const isLoggedIn = await page.locator('button[aria-haspopup="menu"]')
    .isVisible()
    .catch(() => false)
  if (isLoggedIn) await logoutUser(page)
}

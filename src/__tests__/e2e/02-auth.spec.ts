import { test, expect } from '@playwright/test'
import { loginUser, TEST_USER } from './helpers/auth'

// Login page uses <Label> + <Input> with no placeholder.
// Inputs are identified by their preceding Label text via getByLabel().

test.describe('Login page', () => {
  test('shows login form fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    // Two sign-in buttons exist: Google + email. Use exact name for email one.
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
  })

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/^email$/i).fill('wrong@example.com')
    await page.getByLabel(/^password$/i).fill('wrongpassword123')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    // Error rendered as <p className="text-xs font-medium text-destructive">
    await expect(
      page.locator('.text-destructive').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('shows browser validation on empty submit', async ({ page }) => {
    await page.goto('/login')
    // Inputs have required attribute — browser native validation fires
    // We verify the email field is still empty and focused after submit attempt
    await page.getByRole('button', { name: /^sign in$/i }).click()
    // Email input should still be visible and empty (form did not submit)
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    const value = await page.getByLabel(/^email$/i).inputValue()
    expect(value).toBe('')
  })

  test('has link to signup page', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 5000 })
  })

  test('has link to forgot password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 5000 })
  })

  test('successful login redirects to home', async ({ page }) => {
    test.skip(!TEST_USER.email, 'E2E_TEST_EMAIL not set')
    await loginUser(page)
    await expect(page).toHaveURL(/\/(home|explore)/)
  })
})

test.describe('Signup page', () => {
  test('shows signup form fields', async ({ page }) => {
    await page.goto('/signup')
    // SignupPage uses Label + Input — find by label text
    await expect(page.getByLabel(/^name|full name|display name$/i).first()).toBeVisible()
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^create account$/i })).toBeVisible()
  })

  test('shows error on duplicate email', async ({ page }) => {
    test.skip(!TEST_USER.email, 'E2E_TEST_EMAIL not set')
    await page.goto('/signup')
    await page.getByLabel('Display name').fill('Test User')
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').first().fill('Password123!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.locator('p.text-destructive, [class*="destructive"]').first())
      .toBeVisible({ timeout: 10000 })
  })

  test('shows password strength indicator for short password', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/^password$/i).first().fill('123')
    // SignupPage has getPasswordStrength which shows a strength bar/text
    await expect(
      page.getByText(/weak|too short|strength/i).first()
    ).toBeVisible({ timeout: 4000 })
  })
})

test.describe('Forgot password page', () => {
  test('shows email label and submit button', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('shows success state after submitting valid email', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()
    // Success state: shows "Check your inbox" heading
    await expect(
      page.getByText(/check your inbox/i)
    ).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Protected route redirects', () => {
  const protectedPaths = [
    '/home',
    '/write-review',
    '/my-profile',
    '/settings',
    '/wishlist',
    '/notifications',
    '/rewards',
  ]

  for (const path of protectedPaths) {
    test(`${path} redirects to login when logged out`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
      expect(page.url()).toContain('redirect')
    })
  }
})

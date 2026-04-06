import { test, expect, type Page } from '@playwright/test'

test.describe('Landing page', () => {
  test('loads and shows hero search bar', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DishCheck/i)
    // HeroSearchBar renders a div with a Search icon and span text, not an input
    await expect(page.getByText('Search for a dish or restaurant...')).toBeVisible({ timeout: 8000 })
  })

  test('shows city pills', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText(/bengaluru|gurugram/i).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('shows top dishes section', async ({ page }) => {
    await page.goto('/')
    // DishCard renders as a <Link> (anchor) with href=/dish/
    await expect(
      page.locator('a[href*="/dish/"]').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('hero search click navigates to explore', async ({ page }) => {
    await page.goto('/')
    // HeroSearchBar is a clickable div that pushes /explore?focus=1
    await page.getByText('Search for a dish or restaurant...').click()
    await expect(page).toHaveURL(/\/explore/, { timeout: 8000 })
  })
})

test.describe('Explore page', () => {
  test('loads with dish results', async ({ page }) => {
    await page.goto('/explore')
    // DishCard renders as <Link href="/dish/..."> — wait for at least one
    await expect(
      page.locator('a[href*="/dish/"]').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('search bar filters results and updates URL', async ({ page }) => {
    await page.goto('/explore')
    // Navbar SearchBar renders an <Input> with placeholder
    const searchBox = page.getByPlaceholder('Search for a dish or restaurant...')
    await searchBox.fill('biryani')
    await page.waitForURL(/q=biryani/i, { timeout: 6000 })
    expect(page.url()).toContain('q=biryani')
  })

  test('clicking a dish card navigates to dish detail', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForSelector('a[href*="/dish/"]', { timeout: 15000 })
    const href = await page.locator('a[href*="/dish/"]').first().getAttribute('href')
    expect(href).toBeTruthy()
    await page.goto(href!)
    await expect(page).toHaveURL(/\/dish\//)
  })

  test('dietary filter updates URL', async ({ page }) => {
    await page.goto('/explore')
    // ExploreFilters renders dietary as filter chips — look for Veg button
    const vegFilter = page.getByRole('button', { name: /^veg$/i }).first()
    if (await vegFilter.isVisible({ timeout: 5000 })) {
      await vegFilter.click()
      await page.waitForURL(/dietary=veg/i, { timeout: 5000 })
    }
  })
})

test.describe('Dish detail page', () => {
  async function getFirstDishHref(p: Page) {
    await p.goto('/explore')
    await p.waitForSelector('a[href*="/dish/"]', { timeout: 15000 })
    return p.locator('a[href*="/dish/"]').first().getAttribute('href')
  }

  test('loads dish heading and ratings', async ({ page }) => {
    const href = await getFirstDishHref(page)
    if (!href) test.skip()
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/taste|portion|value/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('shows related dishes section', async ({ page }) => {
    const href = await getFirstDishHref(page)
    if (!href) test.skip()
    await page.goto(href!)
    // Related dishes section contains links to other dishes
    const relatedLinks = page.locator('a[href*="/dish/"]').nth(1)
    await expect(relatedLinks).toBeVisible({ timeout: 10000 })
  })

  test('wishlist button is visible when logged out', async ({ page }) => {
    const href = await getFirstDishHref(page)
    if (!href) test.skip()
    await page.goto(href!)
    // WishlistButton renders a <button> — find by Heart icon or data-testid
    await expect(
      page.locator('[data-testid="wishlist-btn"]').or(
        page.getByRole('button', { name: /save|wishlist/i })
      ).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('write review redirects to login when logged out', async ({ page }) => {
    const href = await getFirstDishHref(page)
    if (!href) test.skip()
    await page.goto(href!)
    const reviewLink = page.getByRole('link', { name: /write a review|review this/i }).or(
      page.getByRole('button', { name: /write a review/i })
    ).first()
    if (await reviewLink.isVisible({ timeout: 6000 })) {
      await reviewLink.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 6000 })
      expect(page.url()).toContain('redirect')
    }
  })
})

test.describe('Restaurant detail page', () => {
  async function getFirstRestaurantHref(p: Page) {
    await p.goto('/explore')
    await p.waitForSelector('a[href*="/dish/"]', { timeout: 15000 })
    const dishHref = await p.locator('a[href*="/dish/"]').first().getAttribute('href')
    if (!dishHref) return null
    await p.goto(dishHref)
    return p.locator('a[href*="/restaurant/"]').first().getAttribute('href')
  }

  test('loads restaurant heading', async ({ page }) => {
    const href = await getFirstRestaurantHref(page)
    if (!href) test.skip()
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8000 })
  })

  test('shows dish list for restaurant', async ({ page }) => {
    const href = await getFirstRestaurantHref(page)
    if (!href) test.skip()
    await page.goto(href!)
    await expect(
      page.locator('a[href*="/dish/"]').first()
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('404 and error pages', () => {
  test('shows not-found content for unknown dish', async ({ page }) => {
    await page.goto('/dish/this-dish-does-not-exist-abc123')
    // not-found.tsx renders h1 "Oops, nothing here!" and links to /explore
    await expect(
      page.getByRole('heading', { name: /oops|not found|nothing here/i }).or(
        page.getByRole('link', { name: /explore dishes/i })
      ).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('shows not-found content for unknown restaurant', async ({ page }) => {
    await page.goto('/restaurant/this-restaurant-does-not-exist-abc123')
    await expect(
      page.getByRole('heading', { name: /oops|not found|nothing here/i }).or(
        page.getByRole('link', { name: /explore dishes/i })
      ).first()
    ).toBeVisible({ timeout: 8000 })
  })
})

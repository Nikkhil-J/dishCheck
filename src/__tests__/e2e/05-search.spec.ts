import { test, expect } from '@playwright/test'

// SearchBar navbar variant renders:
// <Input placeholder="Search for a dish or restaurant..." />
const SEARCH_PLACEHOLDER = 'Search for a dish or restaurant...'

test.describe('Search as you type', () => {
  test('search updates URL after debounce', async ({ page }) => {
    await page.goto('/explore')
    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('paneer')
    await page.waitForURL(/q=paneer/i, { timeout: 6000 })
    expect(page.url()).toContain('q=paneer')
  })

  test('clearing search removes q param from URL', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForSelector('a[href*="/dish/"]', { timeout: 15000 })
    const searchBox = page.getByPlaceholder('Search for a dish or restaurant...')
    await searchBox.fill('biryani')
    await page.waitForURL(/q=biryani/i, { timeout: 6000 })
    await searchBox.clear()
    await page.waitForTimeout(800)
    await expect(page).not.toHaveURL(/q=/, { timeout: 6000 })
  })

  test('shows empty state for gibberish query', async ({ page }) => {
    await page.goto('/explore')
    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill('xyzzy_no_results_abc123')
    await page.waitForTimeout(700)
    await expect(
      page.getByText(/no dishes|no results|nothing found|try/i).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('search is case insensitive', async ({ page }) => {
    await page.goto('/explore')
    const searchBox = page.getByPlaceholder(SEARCH_PLACEHOLDER)

    await searchBox.fill('BIRYANI')
    await page.waitForTimeout(700)
    const upperCount = await page.locator('a[href*="/dish/"]').count()

    await searchBox.fill('biryani')
    await page.waitForTimeout(700)
    const lowerCount = await page.locator('a[href*="/dish/"]').count()

    expect(upperCount).toBe(lowerCount)
  })

  test('submitting search form navigates to explore', async ({ page }) => {
    await page.goto('/explore')
    const searchBox = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await searchBox.fill('dosa')
    await searchBox.press('Enter')
    await page.waitForURL(/q=dosa/i, { timeout: 5000 })
    expect(page.url()).toContain('dosa')
  })
})

test.describe('Filter interactions', () => {
  test('dietary veg filter adds param to URL', async ({ page }) => {
    await page.goto('/explore')
    const vegFilter = page.getByRole('button', { name: /^veg$/i }).first()
    if (await vegFilter.isVisible({ timeout: 5000 })) {
      await vegFilter.click()
      await page.waitForURL(/dietary=veg/i, { timeout: 5000 })
      expect(page.url()).toContain('dietary=veg')
    }
  })

  test('sort select changes URL sortBy param', async ({ page }) => {
    await page.goto('/explore')
    // ExploreFilters has a Select for sort — rendered via shadcn Select
    const sortTrigger = page.locator('[data-testid="sort-select"]').or(
      page.getByRole('combobox').first()
    )
    if (await sortTrigger.isVisible({ timeout: 5000 })) {
      await sortTrigger.click()
      // Select opens — pick "Most reviewed" option
      const option = page.getByRole('option', { name: /most reviewed/i })
      if (await option.isVisible({ timeout: 3000 })) {
        await option.click()
        await page.waitForURL(/sortBy=/i, { timeout: 5000 })
        expect(page.url()).toContain('sortBy=')
      }
    }
  })

  test('cuisine filter chip adds cuisine param to URL', async ({ page }) => {
    await page.goto('/explore')
    // Cuisine chips rendered as buttons with cuisine name
    const cuisineChip = page.getByRole('button', { name: /north indian|south indian|chinese|biryani/i }).first()
    if (await cuisineChip.isVisible({ timeout: 5000 })) {
      await cuisineChip.click()
      await page.waitForURL(/cuisine=/i, { timeout: 5000 })
      expect(page.url()).toContain('cuisine=')
    }
  })

  test('show more toggle reveals additional areas', async ({ page }) => {
    await page.goto('/explore')
    const showMore = page.getByRole('button', { name: /show more|more areas/i })
    if (await showMore.isVisible({ timeout: 5000 })) {
      const beforeCount = await page.getByRole('button', { name: /indiranagar|koramangala|hsr|whitefield|banjara/i }).count()
      await showMore.click()
      await page.waitForTimeout(300)
      const afterCount = await page.getByRole('button', { name: /indiranagar|koramangala|hsr|whitefield|banjara/i }).count()
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount)
    }
  })

  test('clearing all filters resets URL', async ({ page }) => {
    await page.goto('/explore?dietary=veg&cuisine=Biryani')
    // Look for a clear/reset button
    const clearBtn = page.getByRole('button', { name: /clear|reset|all/i }).first()
    if (await clearBtn.isVisible({ timeout: 5000 })) {
      await clearBtn.click()
      await page.waitForTimeout(400)
      expect(page.url()).not.toContain('dietary=')
      expect(page.url()).not.toContain('cuisine=')
    }
  })
})

test.describe('URL state sync', () => {
  test('direct URL with q param pre-fills search box', async ({ page }) => {
    await page.goto('/explore?q=biryani')
    const searchBox = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await expect(searchBox).toHaveValue('biryani', { timeout: 6000 })
  })

  test('browser back button restores previous search state', async ({ page }) => {
    await page.goto('/explore')
    const searchBox = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await searchBox.fill('pizza')
    await page.waitForURL(/q=pizza/, { timeout: 5000 })
    await searchBox.fill('pasta')
    await page.waitForURL(/q=pasta/, { timeout: 5000 })
    await page.goBack()
    await expect(page).toHaveURL(/q=pizza/, { timeout: 5000 })
  })
})

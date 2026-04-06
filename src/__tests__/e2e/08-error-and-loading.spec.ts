import { test, expect } from '@playwright/test'

test.describe('Loading states', () => {
  test('explore page shows content within reasonable time', async ({ page }) => {
    await page.goto('/explore')
    // Should show dish cards within 15s — if not, Firestore or SSR is broken
    await expect(
      page.locator('a[href*="/dish/"]').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('dish detail page shows content within reasonable time', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForSelector('a[href*="/dish/"]', { timeout: 15000 })
    const href = await page.locator('a[href*="/dish/"]').first().getAttribute('href')
    if (!href) test.skip()
    const start = Date.now()
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const elapsed = Date.now() - start
    // Page should load meaningful content within 8 seconds
    expect(elapsed).toBeLessThan(8000)
  })

  test('sitemap returns 200', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('<urlset')
    expect(body).toContain('/dish/')
    expect(body).toContain('/restaurant/')
  })
})

test.describe('API health checks', () => {
  test('GET /api/cities returns valid response', async ({ page }) => {
    const response = await page.request.get('/api/cities')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.items).toBeDefined()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)
    // Each item should have city and areas
    expect(body.items[0].city).toBeDefined()
    expect(Array.isArray(body.items[0].areas)).toBe(true)
  })

  test('GET /api/dishes returns paginated results', async ({ page }) => {
    const response = await page.request.get('/api/dishes')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.items).toBeDefined()
    expect(Array.isArray(body.items)).toBe(true)
  })

  test('GET /api/dishes with search query returns filtered results', async ({ page }) => {
    const response = await page.request.get('/api/dishes?q=biryani')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.items).toBeDefined()
  })

  test('GET /api/dishes with invalid params returns 400', async ({ page }) => {
    const response = await page.request.get('/api/dishes?sortBy=invalid_value')
    expect(response.status()).toBe(400)
  })

  test('GET /api/restaurants returns results', async ({ page }) => {
    const response = await page.request.get('/api/restaurants')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.items).toBeDefined()
    expect(Array.isArray(body.items)).toBe(true)
  })

  test('GET /api/restaurants/nonexistent returns 404', async ({ page }) => {
    const response = await page.request.get('/api/restaurants/this-does-not-exist-abc123')
    expect(response.status()).toBe(404)
  })

  test('POST /api/reviews without auth returns 401', async ({ page }) => {
    const response = await page.request.post('/api/reviews', {
      data: { dishId: 'test', restaurantId: 'test', tasteRating: 4, portionRating: 3, valueRating: 5 }
    })
    expect(response.status()).toBe(401)
  })

  test('POST /api/reviews/fake-id/helpful without auth returns 401', async ({ page }) => {
    const response = await page.request.post('/api/reviews/fake-id/helpful')
    expect(response.status()).toBe(401)
  })

  test('GET /api/rewards/balance without auth returns 401', async ({ page }) => {
    const response = await page.request.get('/api/rewards/balance')
    expect(response.status()).toBe(401)
  })

  test('GET /api/notifications/unread-count without auth returns 401', async ({ page }) => {
    const response = await page.request.get('/api/notifications/unread-count')
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/coupons without auth returns 401 or 403', async ({ page }) => {
    const response = await page.request.get('/api/admin/coupons')
    expect([401, 403]).toContain(response.status())
  })
})

test.describe('Error boundaries', () => {
  test('error page for unknown dish shows recovery options', async ({ page }) => {
    await page.goto('/dish/nonexistent-dish-id-abc123')
    // not-found.tsx: h1 "Oops, nothing here!" + links to / and /explore
    await expect(
      page.getByRole('heading', { name: /oops|not found|nothing here/i }).or(
        page.getByRole('link', { name: /explore dishes|back to home/i })
      ).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('back to home link works from 404 page', async ({ page }) => {
    await page.goto('/dish/nonexistent-dish-id-abc123')
    await page.waitForSelector('a[href="/"]', { timeout: 8000 })
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('explore dishes link works from 404 page', async ({ page }) => {
    await page.goto('/restaurant/nonexistent-restaurant-id-abc123')
    await page.waitForSelector('a[href="/explore"]', { timeout: 8000 })
    await page.getByRole('link', { name: /explore dishes/i }).click()
    await expect(page).toHaveURL('/explore', { timeout: 5000 })
  })
})

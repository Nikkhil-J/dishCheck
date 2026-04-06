/**
 * Google Maps Places API (New) client.
 *
 * Used by:
 *   - scripts/ingest-google-places.ts  (bulk restaurant ingestion)
 *   - Future "Add a restaurant" runtime flow
 *
 * Requires GOOGLE_PLACES_API_KEY in environment.
 */

// ── Types for the Places API (New) Text Search response ──

interface PlacesTextSearchResponse {
  places?: GooglePlace[]
  nextPageToken?: string
}

interface GooglePlace {
  id: string // Google's internal place ID
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  types?: string[]
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  rating?: number
  addressComponents?: AddressComponent[]
}

interface AddressComponent {
  longText: string
  shortText: string
  types: string[]
}

// ── Public types ─────────────────────────────────────────

export interface PlaceSearchResult {
  googlePlaceId: string
  name: string
  address: string
  area: string
  city: string
  coordinates: { lat: number; lng: number }
  cuisines: string[]
  phoneNumber: string | null
  website: string | null
  googleMapsUrl: string | null
  googleRating: number | null
}

export interface PlaceSearchOptions {
  city: string
  cuisine?: string
  limit?: number
  pageToken?: string
}

export interface PlaceSearchPage {
  results: PlaceSearchResult[]
  nextPageToken: string | null
}

// ── Helpers ──────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    throw new Error(
      'Missing required environment variable: GOOGLE_PLACES_API_KEY. ' +
      'See .env.local.example for setup instructions.'
    )
  }
  return key
}

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.addressComponents',
].join(',')

/**
 * Infer the neighbourhood/area from addressComponents.
 * Tries sublocality_level_1 → sublocality → locality → city fallback.
 */
function extractArea(components: AddressComponent[] | undefined, fallbackCity: string): string {
  if (!components?.length) return fallbackCity

  const priorities = [
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'locality',
  ]

  for (const target of priorities) {
    const match = components.find((c) => c.types.includes(target))
    if (match) return match.longText
  }

  return fallbackCity
}

/**
 * Infer the city from addressComponents.
 * Falls back to the city passed in search options.
 */
function extractCity(components: AddressComponent[] | undefined, fallbackCity: string): string {
  if (!components?.length) return fallbackCity

  const match = components.find(
    (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  )
  return match?.longText ?? fallbackCity
}

/**
 * Map Google Place types to our cuisine list.
 * The Places API returns types like "indian_restaurant", "chinese_restaurant", etc.
 */
function inferCuisines(place: GooglePlace, requestedCuisine?: string): string[] {
  const cuisines: string[] = []
  const types = (place.types ?? []).map((t) => t.toLowerCase())

  const TYPE_CUISINE_MAP: Record<string, string> = {
    indian_restaurant: 'North Indian',
    south_indian_restaurant: 'South Indian',
    chinese_restaurant: 'Chinese',
    italian_restaurant: 'Italian',
    japanese_restaurant: 'Japanese',
    thai_restaurant: 'Thai',
    mexican_restaurant: 'Mexican',
    korean_restaurant: 'Korean',
    vietnamese_restaurant: 'Vietnamese',
    pizza_restaurant: 'Italian',
    hamburger_restaurant: 'Fast Food',
    fast_food_restaurant: 'Fast Food',
    seafood_restaurant: 'Seafood',
    steak_house: 'Continental',
    barbecue_restaurant: 'BBQ',
    breakfast_restaurant: 'Breakfast',
    brunch_restaurant: 'Breakfast',
    cafe: 'Cafe',
    coffee_shop: 'Cafe',
    bakery: 'Bakery',
    ice_cream_shop: 'Desserts',
  }

  for (const type of types) {
    const mapped = TYPE_CUISINE_MAP[type]
    if (mapped && !cuisines.includes(mapped)) {
      cuisines.push(mapped)
    }
  }

  if (requestedCuisine && !cuisines.includes(requestedCuisine)) {
    cuisines.unshift(requestedCuisine)
  }

  if (cuisines.length === 0) {
    cuisines.push(requestedCuisine ?? 'North Indian')
  }

  return cuisines
}

function mapPlaceToResult(place: GooglePlace, options: PlaceSearchOptions): PlaceSearchResult {
  return {
    googlePlaceId: place.id,
    name: place.displayName?.text ?? 'Unknown Restaurant',
    address: place.formattedAddress ?? '',
    area: extractArea(place.addressComponents, options.city),
    city: extractCity(place.addressComponents, options.city),
    coordinates: {
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
    },
    cuisines: inferCuisines(place, options.cuisine),
    phoneNumber: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    googleRating: place.rating ?? null,
  }
}

// ── Public API ───────────────────────────────────────────

/**
 * Searches Google Maps Places (New) Text Search for restaurants.
 * Returns one page of results with an optional nextPageToken.
 */
export async function searchPlaces(options: PlaceSearchOptions): Promise<PlaceSearchPage> {
  const apiKey = getApiKey()

  const textQuery = options.cuisine
    ? `${options.cuisine} restaurants in ${options.city}`
    : `restaurants in ${options.city}`

  const body: Record<string, unknown> = {
    textQuery,
    includedType: 'restaurant',
    languageCode: 'en',
    maxResultCount: Math.min(options.limit ?? 20, 20),
  }

  if (options.pageToken) {
    body.pageToken = options.pageToken
  }

  const response = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Places API error ${response.status}: ${text}`)
  }

  const data: PlacesTextSearchResponse = await response.json()

  const results = (data.places ?? []).map((place) => mapPlaceToResult(place, options))

  return {
    results,
    nextPageToken: data.nextPageToken ?? null,
  }
}

/**
 * Fetches ALL pages of results up to `limit`, respecting rate limits.
 * Yields results page-by-page for streaming processing.
 */
export async function* searchPlacesAll(
  options: PlaceSearchOptions
): AsyncGenerator<PlaceSearchResult[], void, unknown> {
  const limit = options.limit ?? 100
  let fetched = 0
  let pageToken: string | undefined = undefined

  while (fetched < limit) {
    const pageSize = Math.min(20, limit - fetched)
    const page = await searchPlaces({
      ...options,
      limit: pageSize,
      pageToken,
    })

    if (page.results.length === 0) break

    yield page.results
    fetched += page.results.length

    if (!page.nextPageToken || fetched >= limit) break
    pageToken = page.nextPageToken

    await delay(200)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

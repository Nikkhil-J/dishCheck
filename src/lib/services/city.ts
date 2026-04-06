import { CITY_AREAS, SUPPORTED_CITIES, type City } from '@/lib/constants'

export const DEFAULT_CITY: City = 'Bengaluru'

export function isSupportedCity(value: string | null | undefined): value is City {
  if (!value) return false
  return (SUPPORTED_CITIES as readonly string[]).includes(value)
}

export function resolveCity(options?: {
  requestedCity?: string | null
  userCity?: string | null
  fallbackCity?: City
}): City {
  const requestedCity = options?.requestedCity
  const userCity = options?.userCity
  const fallback = options?.fallbackCity ?? DEFAULT_CITY

  if (isSupportedCity(requestedCity)) return requestedCity
  if (isSupportedCity(userCity)) return userCity
  return fallback
}

export function listCityAreas(city: City): readonly string[] {
  return CITY_AREAS[city] ?? []
}


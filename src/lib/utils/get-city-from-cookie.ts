import { cookies } from 'next/headers'
import { SUPPORTED_CITIES } from '@/lib/constants'
import type { City } from '@/lib/constants'

export async function getCityFromCookie(): Promise<City | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get('dishcheck-city')?.value
  if (value && (SUPPORTED_CITIES as readonly string[]).includes(value)) {
    return value as City
  }
  return null
}

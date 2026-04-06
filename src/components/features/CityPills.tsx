'use client'

import { useRouter } from 'next/navigation'
import { SUPPORTED_CITIES } from '@/lib/constants'
import { useCityContext } from '@/lib/context/CityContext'
import type { City } from '@/lib/constants'

interface CityPillsProps {
  currentCity: string
}

export function CityPills({ currentCity }: CityPillsProps) {
  const { setCity } = useCityContext()
  const router = useRouter()

  function handleCityChange(c: City) {
    setCity(c)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      {SUPPORTED_CITIES.map((city) => (
        <button
          key={city}
          type="button"
          onClick={() => handleCityChange(city)}
          className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors ${
            city === currentCity
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-card text-text-primary hover:border-primary hover:text-primary'
          }`}
        >
          {city}
        </button>
      ))}
    </div>
  )
}

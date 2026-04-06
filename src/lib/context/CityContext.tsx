'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { SUPPORTED_CITIES } from '@/lib/constants'
import type { City } from '@/lib/constants'

interface CityContextValue {
  city: City
  setCity: (city: City) => void
}

const CityContext = createContext<CityContextValue>({
  city: 'Bengaluru',
  setCity: () => {},
})

function setCityCookie(city: City) {
  document.cookie = `dishcheck-city=${city}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<City>(() => {
    if (typeof window === 'undefined') return 'Bengaluru'

    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('dishcheck-city='))
      ?.split('=')[1]

    if (cookieValue && (SUPPORTED_CITIES as readonly string[]).includes(cookieValue)) {
      localStorage.setItem('dishcheck-city', cookieValue)
      return cookieValue as City
    }

    const stored = localStorage.getItem('dishcheck-city')
    if (stored && (SUPPORTED_CITIES as readonly string[]).includes(stored)) {
      setCityCookie(stored as City)
      return stored as City
    }

    return 'Bengaluru'
  })

  function handleSetCity(c: City) {
    setCity(c)
    localStorage.setItem('dishcheck-city', c)
    setCityCookie(c)
  }

  return (
    <CityContext.Provider value={{ city, setCity: handleSetCity }}>
      {children}
    </CityContext.Provider>
  )
}

export function useCityContext() {
  return useContext(CityContext)
}

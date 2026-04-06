'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface SearchBarProps {
  variant: 'navbar' | 'hero'
  autoFocus?: boolean
  initialQuery?: string
}

export function SearchBar({ variant, autoFocus, initialQuery = '' }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const urlQuery = variant === 'navbar' ? (searchParams.get('q') ?? '') : ''
  const [query, setQuery] = useState(initialQuery || urlQuery)
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery)
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery)
    setQuery(urlQuery)
  }

  useEffect(() => {
    if (variant !== 'navbar' || searchParams.get('focus') !== '1') return

    const timer = setTimeout(() => {
      inputRef.current?.focus()
      const params = new URLSearchParams(searchParams.toString())
      params.delete('focus')
      const newUrl = params.toString() ? `/explore?${params.toString()}` : '/explore'
      router.replace(newUrl, { scroll: false })
    }, 300)
    return () => clearTimeout(timer)
  }, [variant, searchParams, router])

  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (variant !== 'navbar') return
    if (debouncedQuery.length >= 2) {
      router.push(`/explore?q=${encodeURIComponent(debouncedQuery)}`)
    } else if (debouncedQuery.length === 0 && searchParams.get('q')) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('q')
      const newUrl = params.toString() ? `/explore?${params.toString()}` : '/explore'
      router.push(newUrl)
    }
  }, [debouncedQuery, variant, router, searchParams])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`)
    }
  }

  if (variant === 'hero') {
    return (
      <div
        className="flex items-center gap-3 rounded-pill border border-border bg-card py-4 pl-6 pr-4 text-left shadow-lg"
      >
        <Search className="h-5 w-5 shrink-0 text-text-muted" />
        <span className="flex-1 text-base text-text-muted">
          Search for a dish or restaurant...
        </span>
        <span className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white">
          Search
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="hidden w-full max-w-[400px] md:block">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted" />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a dish or restaurant..."
          autoFocus={autoFocus}
          className={cn(
            'h-auto w-full rounded-pill border border-border bg-card/50 py-2 pl-10 pr-4 text-sm font-body',
            'placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-0'
          )}
        />
      </div>
    </form>
  )
}

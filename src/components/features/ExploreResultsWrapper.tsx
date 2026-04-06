'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

let pendingFlag = false
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return pendingFlag
}

function setPendingFlag(val: boolean) {
  if (pendingFlag !== val) {
    pendingFlag = val
    listeners.forEach((cb) => cb())
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('explore-filter-change', () => setPendingFlag(true))
}

export function resetExplorePending() {
  setPendingFlag(false)
}

export function ExploreResultsWrapper({ children }: { children: React.ReactNode }) {
  const pending = useSyncExternalStore(subscribe, getSnapshot, () => false)

  useEffect(() => {
    setPendingFlag(false)
  })

  return (
    <div className="relative">
      {pending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}
      <div className={pending ? 'pointer-events-none opacity-50' : ''}>
        {children}
      </div>
    </div>
  )
}

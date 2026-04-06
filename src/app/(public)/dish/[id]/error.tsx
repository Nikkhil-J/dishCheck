'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DishError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <div className="text-5xl">😕</div>
      <h2 className="mt-4 font-display text-xl font-bold text-bg-dark">Something went wrong</h2>
      <p className="mt-2 text-sm text-text-secondary">We couldn&apos;t load this dish page.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button
          onClick={reset}
          className="rounded-pill px-5 py-2.5 font-semibold hover:bg-primary-dark"
        >
          Try again
        </Button>
        <Button
          variant="outline"
          render={<Link href="/explore" />}
          className="rounded-pill border-2 border-border px-5 py-2.5 font-semibold text-text-primary hover:border-primary hover:text-primary"
        >
          Explore dishes
        </Button>
      </div>
    </div>
  )
}

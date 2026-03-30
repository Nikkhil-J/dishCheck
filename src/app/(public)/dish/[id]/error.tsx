'use client'

import Link from 'next/link'

export default function DishError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="text-4xl">😕</div>
      <h2 className="mt-4 text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-gray-500">We couldn&apos;t load this dish page.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">
          Try again
        </button>
        <Link href="/browse" className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
          Browse dishes
        </Link>
      </div>
    </div>
  )
}

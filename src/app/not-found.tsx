import Link from 'next/link'
import { PageShell } from '@/components/layouts/PageShell'

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="text-8xl">🍽️</div>
        <h1 className="mt-6 font-display text-4xl font-bold text-bg-dark">
          Oops, nothing here!
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Looks like this dish wandered off the menu.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-pill bg-primary px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-glow"
          >
            Back to home
          </Link>
          <Link
            href="/explore"
            className="rounded-pill border-2 border-border px-8 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary"
          >
            Explore dishes
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

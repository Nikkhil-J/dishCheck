import { type ReactNode } from 'react'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  onCta?: () => void
}

export function EmptyState({ icon, title, description, ctaLabel, ctaHref, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {icon && <div className="text-6xl">{icon}</div>}
      <h3 className="font-display text-xl font-bold text-bg-dark">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-text-secondary">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-2 inline-flex items-center justify-center rounded-pill bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-glow"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCta && !ctaHref && (
        <button
          onClick={onCta}
          className="mt-2 inline-flex items-center justify-center rounded-pill bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-glow"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}

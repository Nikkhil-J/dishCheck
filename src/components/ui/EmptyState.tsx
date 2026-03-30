import { type ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ icon, title, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-4xl text-gray-300">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && <p className="max-w-xs text-sm text-gray-400">{description}</p>}
      {ctaLabel && onCta && (
        <Button variant="primary" size="sm" onClick={onCta} className="mt-2">
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}

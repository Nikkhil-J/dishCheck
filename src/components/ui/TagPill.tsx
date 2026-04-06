'use client'

import { cn } from '@/lib/utils'

interface TagPillProps {
  label: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}

export function TagPill({ label, selected = false, onClick, disabled = false }: TagPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-pill border-2 px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-card text-text-secondary hover:border-primary hover:text-primary'
      )}
    >
      {label}
    </button>
  )
}

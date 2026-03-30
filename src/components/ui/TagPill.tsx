'use client'

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
      className={[
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-gray-300 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-600',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

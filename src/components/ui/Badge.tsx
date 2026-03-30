import type { UserLevel, DietaryType } from '@/lib/types'

type Variant = UserLevel | DietaryType | 'default'

interface BadgeProps {
  label: string
  variant?: Variant
  className?: string
}

const variantClasses: Record<Variant, string> = {
  Newbie:    'bg-gray-100 text-gray-600',
  Foodie:    'bg-emerald-100 text-emerald-700',
  Critic:    'bg-amber-100 text-amber-700',
  Legend:    'bg-purple-100 text-purple-700',
  veg:       'bg-emerald-100 text-emerald-700',
  'non-veg': 'bg-red-100 text-red-700',
  egg:       'bg-yellow-100 text-yellow-700',
  default:   'bg-gray-100 text-gray-600',
}

export function Badge({ label, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}

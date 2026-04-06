import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showWordmark?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 34, text: 'text-xl' },
  lg: { icon: 40, text: 'text-2xl' },
}

export function Logo({ className, showWordmark = true, size = 'md' }: LogoProps) {
  const s = sizes[size]
  return (
    <span className={cn('flex items-center gap-2 font-display font-bold text-primary', className)}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 34 34"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="34" height="34" rx="10" fill="currentColor" />
        <path
          d="M10 12.5C10 11.67 10.67 11 11.5 11H15.5C16.33 11 17 11.67 17 12.5V22.5C17 23.33 16.33 24 15.5 24H11.5C10.67 24 10 23.33 10 22.5V12.5Z"
          fill="white"
          opacity="0.9"
        />
        <path
          d="M18.5 9.5C18.5 8.67 19.17 8 20 8H22C22.83 8 23.5 8.67 23.5 9.5V22.5C23.5 23.33 22.83 24 22 24H20C19.17 24 18.5 23.33 18.5 22.5V9.5Z"
          fill="white"
          opacity="0.7"
        />
        <circle cx="13.5" cy="8.5" r="1.5" fill="white" opacity="0.9" />
      </svg>
      {showWordmark && <span className={s.text}>DishCheck</span>}
    </span>
  )
}

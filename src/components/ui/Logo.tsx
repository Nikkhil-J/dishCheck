import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showWordmark?: boolean
  wordmarkClassName?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
}

const sizes = {
  sm: { icon: 32, text: 'text-xl' },
  md: { icon: 42, text: 'text-2xl' },
  lg: { icon: 56, text: 'text-3xl' },
}

function CraviaMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 110"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Aroma wisps */}
      <path d="M36 8 C33 2 37 -2 35 -7" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round"/>
      <path d="M44 6 C46 0 42 -4 44 -9" fill="none" stroke="#FAC775" strokeWidth="2" strokeLinecap="round"/>
      <path d="M52 8 C55 2 51 -2 53 -7" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round"/>
      {/* Magnifying glass ring */}
      <circle cx="44" cy="46" r="32" fill="none" stroke="#D85A30" strokeWidth="6"/>
      {/* Lens fill */}
      <circle cx="44" cy="46" r="26" fill="#3D1F14"/>
      {/* Plate rings inside lens */}
      <circle cx="44" cy="46" r="26" fill="none" stroke="#F0997B" strokeWidth="2"/>
      <circle cx="44" cy="46" r="17" fill="none" stroke="#EF9F27" strokeWidth="1.5" opacity="0.6"/>
      {/* Glowing dish center */}
      <circle cx="44" cy="46" r="10" fill="#D85A30"/>
      <circle cx="44" cy="46" r="7" fill="#EF9F27"/>
      <circle cx="44" cy="46" r="3.5" fill="#FAC775"/>
      {/* Lens highlight */}
      <ellipse cx="35" cy="37" rx="6" ry="4" fill="#FAC775" opacity="0.15" transform="rotate(-30 35 37)"/>
      {/* Handle */}
      <rect x="66" y="66" width="8" height="32" rx="4" fill="#D85A30" transform="rotate(45 66 66)"/>
    </svg>
  )
}

export function Logo({
  className,
  showWordmark = true,
  wordmarkClassName,
  size = 'md',
  variant = 'full',
}: LogoProps) {
  const s = sizes[size]
  const renderWordmark = variant === 'full' && showWordmark

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <CraviaMark size={s.icon} />
      {renderWordmark && (
        <span
          className={cn(
            // APPROVED HARDCODED COLOR — brand wordmark requires specific palette
            'text-[#993C1D] dark:text-[#FAC775]',
            s.text,
            wordmarkClassName,
          )}
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}
        >
          Cravia
        </span>
      )}
    </span>
  )
}

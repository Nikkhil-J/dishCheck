import Image from 'next/image'

type Size = 'sm' | 'md' | 'lg'

interface AvatarProps {
  src?: string | null
  name: string
  size?: Size
  className?: string
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
}

const sizePx: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 56,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const px = sizePx[size]

  if (src) {
    return (
      <div className={['relative shrink-0 overflow-hidden rounded-full', sizeClasses[size], className].join(' ')}>
        <Image src={src} alt={name} width={px} height={px} className="object-cover" />
      </div>
    )
  }

  return (
    <div
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700',
        sizeClasses[size],
        className,
      ].join(' ')}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  )
}

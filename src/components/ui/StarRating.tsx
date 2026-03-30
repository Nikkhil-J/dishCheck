'use client'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  const starClass = sizeClasses[size]

  if (readonly) {
    return (
      <div className="flex items-center gap-0.5">
        {stars.map((star) => {
          const fill = Math.min(Math.max(value - (star - 1), 0), 1)
          const fullId = `full-${star}-${value}`
          const halfId = `half-${star}-${value}`

          return (
            <svg
              key={star}
              className={starClass}
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id={fullId}>
                  <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                  <stop offset={`${fill * 100}%`} stopColor="#d1d5db" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#${fullId})`}
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className="focus:outline-none"
          aria-label={`Rate ${star} out of 5`}
        >
          <svg
            className={[starClass, 'transition-colors', star <= value ? 'text-amber-400' : 'text-gray-300'].join(' ')}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

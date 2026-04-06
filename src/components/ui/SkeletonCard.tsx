import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  className?: string
}

const shimmerBg = 'bg-[length:400%_100%] bg-[linear-gradient(90deg,var(--shimmer-from)_25%,var(--shimmer-via)_50%,var(--shimmer-to)_75%)] animate-shimmer'

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
      <div className={cn('h-36 w-full', shimmerBg)} />
      <div className="p-3.5 space-y-2.5">
        <div className={cn('h-4 w-3/4 rounded-md', shimmerBg)} />
        <div className={cn('h-3 w-1/2 rounded-md', shimmerBg)} />
        <div className={cn('h-3 w-1/3 rounded-md', shimmerBg)} />
      </div>
    </div>
  )
}

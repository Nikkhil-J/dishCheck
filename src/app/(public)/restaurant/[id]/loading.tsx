import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function RestaurantLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8 animate-fade-in">
      <div className="h-48 w-full rounded-xl bg-border animate-pulse" />
      <div className="mt-6 space-y-3">
        <div className="h-7 w-64 rounded-md bg-border animate-pulse" />
        <div className="h-4 w-40 rounded-md bg-border animate-pulse" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

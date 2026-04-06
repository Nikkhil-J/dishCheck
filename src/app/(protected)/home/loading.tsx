import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8 animate-fade-in">
      <div className="h-6 w-48 rounded-md bg-border animate-pulse" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

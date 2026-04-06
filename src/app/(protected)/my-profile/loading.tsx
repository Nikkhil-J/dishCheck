import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-border animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-md bg-border animate-pulse" />
          <div className="h-4 w-24 rounded-md bg-border animate-pulse" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

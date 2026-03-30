import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 h-12 w-full animate-pulse rounded-2xl bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}

import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function DishLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
      <div className="mb-8 h-72 w-full animate-pulse rounded-2xl bg-gray-200" />
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}

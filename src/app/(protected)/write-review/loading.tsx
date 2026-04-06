export default function WriteReviewLoading() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10 animate-fade-in">
      <div className="h-7 w-56 rounded-md bg-border animate-pulse" />
      <div className="mt-8 space-y-6">
        <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
        <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
        <div className="aspect-[4/3] w-full rounded-lg bg-border animate-pulse" />
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 flex-1 rounded-lg bg-border animate-pulse" />
          ))}
        </div>
        <div className="h-32 w-full rounded-lg bg-border animate-pulse" />
        <div className="h-12 w-full rounded-lg bg-border animate-pulse" />
      </div>
    </div>
  )
}

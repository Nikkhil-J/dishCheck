export default function RewardsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="h-40 w-full animate-pulse rounded-2xl bg-border" />

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-border" />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-border" />
        ))}
      </div>
    </div>
  )
}

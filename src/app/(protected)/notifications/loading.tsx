export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 animate-fade-in">
      <div className="h-7 w-40 rounded-md bg-border animate-pulse" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-border animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-md bg-border animate-pulse" />
              <div className="h-3 w-1/2 rounded-md bg-border animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

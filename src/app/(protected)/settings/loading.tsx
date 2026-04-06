export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-lg px-6 py-10 animate-fade-in">
      <div className="h-7 w-32 rounded-md bg-border animate-pulse" />
      <div className="mt-8 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded-md bg-border animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
          </div>
        ))}
        <div className="h-12 w-full rounded-lg bg-border animate-pulse" />
      </div>
    </div>
  )
}

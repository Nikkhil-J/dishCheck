export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>
}

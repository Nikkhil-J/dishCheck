import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { MobileBottomNav } from './MobileBottomNav'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-[70px] md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}

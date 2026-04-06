'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Sun, Moon } from 'lucide-react'

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  if (!mounted) return <div className="h-[42px] w-[42px]" />

  function handleToggle() {
    document.documentElement.classList.add('theme-transitioning')
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 250)

    if (resolvedTheme === 'dark') setTheme('light')
    else setTheme('dark')
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={handleToggle}
      className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-bg-cream text-text-secondary transition-colors duration-200 hover:border-primary hover:text-primary"
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={18} strokeWidth={2} />
      ) : (
        <Moon size={18} strokeWidth={2} />
      )}
    </button>
  )
}

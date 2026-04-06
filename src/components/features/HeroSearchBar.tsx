'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { SearchBar } from '@/components/features/SearchBar'

interface HeroSearchBarProps {
  onExiting?: () => void
}

export function HeroSearchBar({ onExiting }: HeroSearchBarProps) {
  const [isExiting, setIsExiting] = useState(false)
  const router = useRouter()

  function handleClick() {
    if (isExiting) return
    setIsExiting(true)
    onExiting?.()
    setTimeout(() => router.push('/explore?focus=1'), 150)
  }

  return (
    <motion.div
      animate={
        isExiting
          ? { opacity: 0, y: -120, scale: 0.95 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onClick={handleClick}
      className="mx-auto w-full max-w-lg cursor-pointer"
    >
      <SearchBar variant="hero" />
    </motion.div>
  )
}

export default HeroSearchBar

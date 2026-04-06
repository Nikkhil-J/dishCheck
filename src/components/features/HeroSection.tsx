'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { HeroSearchBar } from '@/components/features/HeroSearchBar'

const HERO_TAGS = ['Sushi', 'Pizza', 'Wings', 'Ramen', 'Biryani', 'Dimsum']

export function HeroSection() {
  const [heroExiting, setHeroExiting] = useState(false)
  const router = useRouter()

  function handleTagClick(tag: string) {
    if (heroExiting) return
    setHeroExiting(true)
    setTimeout(() => router.push(`/explore?q=${encodeURIComponent(tag)}&focus=1`), 150)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        animate={heroExiting ? { opacity: 0, y: -40 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeIn' }}
      >
        <h1 className="font-display text-4xl font-bold tracking-tight text-bg-dark sm:text-5xl lg:text-6xl">
          Find your next{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            favourite dish
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-text-secondary">
          Honest reviews from real food lovers. Discover amazing dishes — not just restaurants.
        </p>
      </motion.div>

      <div className="mt-8">
        <HeroSearchBar onExiting={() => setHeroExiting(true)} />
      </div>

      <motion.div
        animate={heroExiting ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeIn', delay: 0.05 }}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {HERO_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleTagClick(tag)}
            className="rounded-pill bg-card/80 px-4 py-1.5 text-xs font-medium text-text-secondary shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            {tag}
          </button>
        ))}
      </motion.div>
    </div>
  )
}

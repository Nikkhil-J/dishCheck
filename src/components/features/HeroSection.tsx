'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { HeroSearchBar } from '@/components/features/HeroSearchBar'
import { ROUTES } from '@/lib/constants/routes'

const HERO_TAGS = ['Biryani', 'Pizza', 'Sushi', 'Ramen', 'Dosa', 'Burger']

export function HeroSection() {
  const [heroExiting, setHeroExiting] = useState(false)
  const router = useRouter()

  function handleTagClick(tag: string) {
    if (heroExiting) return
    setHeroExiting(true)
    setTimeout(() => router.push(`${ROUTES.EXPLORE}?q=${encodeURIComponent(tag)}&focus=1`), 150)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        animate={heroExiting ? { opacity: 0, y: -40 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeIn' }}
      >
        <h1 className="font-display text-3xl font-bold tracking-tight text-heading sm:text-5xl lg:text-6xl">
          Find the best dishes at{' '}
          <span className="bg-gradient-to-r from-primary to-brand-orange bg-clip-text text-transparent">
            restaurants near you
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-text-secondary sm:mt-5 sm:text-lg">
          Search restaurants by name, cuisine, or a dish you love. Read honest dish-level reviews from real food lovers.
        </p>
      </motion.div>

      <div className="mt-5 sm:mt-8">
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
            className="inline-flex min-h-[44px] items-center rounded-pill bg-card/80 px-4 text-xs font-medium text-text-secondary shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-md active:shadow-sm"
          >
            {tag}
          </button>
        ))}
      </motion.div>
    </div>
  )
}

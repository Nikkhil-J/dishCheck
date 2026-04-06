'use client'

import { useEffect, useRef, type RefObject } from 'react'

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
): RefObject<T | null> {
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px', once = true } = options
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      el.setAttribute('data-reveal', 'visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal', 'visible')
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            entry.target.setAttribute('data-reveal', '')
          }
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return ref
}

export function useScrollRevealChildren<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
): RefObject<T | null> {
  const { threshold = 0.05, rootMargin = '0px 0px -20px 0px', once = true } = options
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    if (typeof IntersectionObserver === 'undefined') {
      const children = container.querySelectorAll('[data-reveal]')
      children.forEach((child) => child.setAttribute('data-reveal', 'visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal', 'visible')
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            entry.target.setAttribute('data-reveal', '')
          }
        }
      },
      { threshold, rootMargin }
    )

    const children = container.querySelectorAll('[data-reveal]')
    children.forEach((child) => observer.observe(child))

    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return ref
}

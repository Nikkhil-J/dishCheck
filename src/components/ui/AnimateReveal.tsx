'use client'

import { type ReactNode, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useScrollReveal, useScrollRevealChildren } from '@/lib/hooks/useScrollReveal'

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

export function Reveal({ children, className, ...props }: RevealProps) {
  const ref = useScrollReveal()
  return (
    <div ref={ref} data-reveal="" className={cn(className)} {...props}>
      {children}
    </div>
  )
}

interface RevealGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

export function RevealGrid({ children, className, ...props }: RevealGridProps) {
  const ref = useScrollRevealChildren()
  return (
    <div ref={ref} data-reveal-stagger="" className={cn(className)} {...props}>
      {children}
    </div>
  )
}

'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export function ExploreEntranceWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
    >
      {children}
    </motion.div>
  )
}

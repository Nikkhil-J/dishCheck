'use client'

import { useState } from 'react'
import { TagPill } from './TagPill'

interface TagCloudProps {
  tags: string[]
  maxVisible?: number
}

export function TagCloud({ tags, maxVisible = 5 }: TagCloudProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? tags : tags.slice(0, maxVisible)
  const hidden = tags.length - maxVisible

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((tag) => (
        <TagPill key={tag} label={tag} />
      ))}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="rounded-pill border border-border bg-bg-cream px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary"
        >
          +{hidden} more
        </button>
      )}
    </div>
  )
}

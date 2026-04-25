'use client'

import { BookOpen } from 'lucide-react'
import type { ChunkRef } from '@/lib/types'

interface CitationCardProps {
  citation: ChunkRef
  onClick?: (citation: ChunkRef) => void
}

export function CitationCard({ citation, onClick }: CitationCardProps) {
  return (
    <button
      onClick={() => onClick?.(citation)}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 text-left transition-all text-xs"
      title={citation.content.slice(0, 200)}
    >
      <BookOpen className="w-3 h-3 text-primary flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{citation.document_name}</p>
        {citation.page_num > 0 && (
          <p className="text-muted-foreground">p.{citation.page_num}</p>
        )}
      </div>
    </button>
  )
}

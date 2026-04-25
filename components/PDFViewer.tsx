'use client'

import { X, FileText } from 'lucide-react'
import type { ChunkRef } from '@/lib/types'

interface PDFViewerProps {
  chunk: ChunkRef
  onClose: () => void
}

export function PDFViewer({ chunk, onClose }: PDFViewerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {chunk.document_name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors flex-shrink-0"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metadata */}
      <div className="px-3 py-2 bg-muted/30 border-b border-border">
        <p className="text-xs text-muted-foreground">
          Page <span className="font-medium text-foreground">{chunk.page_num}</span>
          {' '}· Chunk{' '}
          <span className="font-medium text-foreground">{chunk.chunk_index + 1}</span>
        </p>
      </div>

      {/* Chunk content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-3 border border-border">
          {chunk.content}
        </div>

        <p className="mt-4 text-xs text-muted-foreground italic">
          Full PDF rendering (PDF.js) is available for future integration.
          The chunk above is the exact text passage used to answer your question.
        </p>
      </div>
    </div>
  )
}

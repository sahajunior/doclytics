'use client'

import { Trash2, FolderOpen } from 'lucide-react'
import type { Workspace } from '@/lib/types'

interface WorkspaceListProps {
  workspaces: Workspace[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function WorkspaceList({
  workspaces,
  onSelect,
  onDelete,
}: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FolderOpen className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-foreground font-medium">No workspaces yet</p>
        <p className="text-muted-foreground text-sm mt-1">
          Create your first workspace to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((ws) => (
        <div
          key={ws.id}
          className="group relative border border-border rounded-xl bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => onSelect(ws.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{ws.name}</h3>
              {ws.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {ws.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(ws.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete workspace "${ws.name}"?`)) {
                  onDelete(ws.id)
                }
              }}
              className="flex-shrink-0 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Delete workspace"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

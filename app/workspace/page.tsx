'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Trash2, FileText, ChevronRight, Search, Cpu, MessageSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Workspace } from '@/lib/types'

export default function WorkspacePage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces')
      if (!res.ok) throw new Error('Failed to fetch workspaces')
      const data = await res.json()
      setWorkspaces(data.workspaces)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create workspace')
      }
      const data = await res.json()
      setName('')
      setDescription('')
      setShowForm(false)
      router.push(`/workspace/${data.workspace.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete workspace')
      setWorkspaces((prev) => prev.filter((w) => w.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">DocuMind</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              Chat with your documents using AI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-85 transition-opacity text-sm font-medium shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New workspace
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-10 p-5 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">How it works</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Search, label: 'Retrieve', desc: 'Your query is embedded and matched against stored document chunks via pgvector cosine similarity' },
              { icon: Cpu, label: 'Augment', desc: 'Top-K relevant chunks are injected into the LLM prompt as grounded context — no hallucination' },
              { icon: MessageSquare, label: 'Generate', desc: 'The model answers strictly from retrieved context and cites the exact source chunks' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
            {error}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="mb-6 p-5 border border-border rounded-2xl bg-card space-y-4">
            <h2 className="font-semibold text-foreground text-sm">New workspace</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Research Project"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-85 transition-opacity disabled:opacity-40 text-sm font-medium"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workspace list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium text-sm">No workspaces yet</p>
              <p className="text-muted-foreground text-xs mt-1">
                Create one to start chatting with your documents
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-85 transition-opacity text-sm font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Create workspace
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <button
                  onClick={() => router.push(`/workspace/${ws.id}`)}
                  className="group w-full flex items-center gap-4 px-4 py-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-accent transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{ws.name}</p>
                    {ws.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{ws.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(ws.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                      onClick={(e) => handleDelete(e, ws.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleDelete(e as unknown as React.MouseEvent, ws.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                      title="Delete workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

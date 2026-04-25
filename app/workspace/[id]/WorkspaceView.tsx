'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { ChatInterface } from '@/components/ChatInterface'
import { UploadButton } from '@/components/UploadButton'
import { PDFViewer } from '@/components/PDFViewer'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Workspace, Document, Conversation, ChunkRef } from '@/lib/types'
import type { Message as AIMessage } from 'ai/react'

interface WorkspaceViewProps {
  workspaceId: string
}

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChunk, setSelectedChunk] = useState<ChunkRef | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [initialMessages, setInitialMessages] = useState<AIMessage[] | undefined>()
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`)
      if (!res.ok) {
        if (res.status === 404) { router.push('/workspace'); return }
        throw new Error('Failed to fetch workspace')
      }
      const data = await res.json()
      setWorkspace(data.workspace)
      setDocuments(data.documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, router])

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conversations`)
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } catch { /* non-fatal */ }
  }, [workspaceId])

  useEffect(() => {
    fetchWorkspace()
    fetchConversations()
  }, [fetchWorkspace, fetchConversations])

  const handleSelectConversation = useCallback(async (id: string) => {
    if (id === conversationId) return
    setLoadingMessages(true)
    setSelectedChunk(null)
    try {
      const res = await fetch(`/api/conversations/${id}/messages`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const msgs: AIMessage[] = (data.messages ?? []).map(
        (m: { id: string; role: 'user' | 'assistant'; content: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })
      )
      setInitialMessages(msgs)
      setConversationId(id)
    } catch { /* fall through */ }
    finally { setLoadingMessages(false) }
  }, [conversationId])

  const handleNewConversation = useCallback(() => {
    setConversationId(undefined)
    setInitialMessages(undefined)
    setSelectedChunk(null)
  }, [])

  const handleConversationCreate = useCallback((id: string) => {
    setConversationId(id)
    fetchConversations()
  }, [fetchConversations])

  const handleDeleteConversation = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (conversationId === id) {
        setConversationId(undefined)
        setInitialMessages(undefined)
      }
    } finally {
      setDeletingId(null)
    }
  }, [conversationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <button
            onClick={() => router.push('/workspace')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to workspaces
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <button
          onClick={() => router.push('/workspace')}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate text-sm">
            {workspace?.name ?? 'Workspace'}
          </h1>
          {workspace?.description && (
            <p className="text-xs text-muted-foreground truncate">{workspace.description}</p>
          )}
        </div>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside className="w-60 flex-shrink-0 border-r border-border flex flex-col bg-card">
          <div className="p-3 border-b border-border">
            <UploadButton workspaceId={workspaceId} onUploadComplete={fetchWorkspace} />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
            {/* Documents */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                Documents ({documents.length})
              </p>
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">Upload a PDF to start</p>
              ) : (
                <ul className="space-y-0.5">
                  {documents.map((doc) => (
                    <li key={doc.id}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate text-foreground text-xs">{doc.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Conversations */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Chats ({conversations.length})
                </p>
                <button
                  onClick={handleNewConversation}
                  className="p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="New chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">No chats yet</p>
              ) : (
                <ul className="space-y-0.5">
                  {conversations.map((convo) => {
                    const isActive = conversationId === convo.id
                    return (
                      <li key={convo.id}>
                        <button
                          onClick={() => handleSelectConversation(convo.id)}
                          className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-foreground border-l-2 border-primary pl-[6px]'
                              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                          <span className="truncate flex-1">{convo.title}</span>
                          {deletingId === convo.id ? (
                            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0 text-muted-foreground" />
                          ) : (
                            <span
                              onClick={(e) => handleDeleteConversation(e, convo.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && handleDeleteConversation(e as unknown as React.MouseEvent, convo.id)}
                              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:text-destructive transition-all"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          {loadingMessages ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ChatInterface
              key={conversationId ?? 'new'}
              workspaceId={workspaceId}
              conversationId={conversationId}
              initialMessages={initialMessages}
              hasDocuments={documents.length > 0}
              onConversationCreate={handleConversationCreate}
              onCitationClick={setSelectedChunk}
            />
          )}
        </main>

        {/* Right panel: chunk viewer */}
        {selectedChunk && (
          <aside className="w-80 flex-shrink-0 border-l border-border bg-card">
            <PDFViewer chunk={selectedChunk} onClose={() => setSelectedChunk(null)} />
          </aside>
        )}
      </div>
    </div>
  )
}

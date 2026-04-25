'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useChat, type Message as AIMessage } from 'ai/react'
import { Send, Loader2, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CitationCard } from '@/components/CitationCard'
import type { ChunkRef } from '@/lib/types'

interface ChatInterfaceProps {
  workspaceId: string
  conversationId?: string
  initialMessages?: AIMessage[]
  hasDocuments?: boolean
  onConversationCreate?: (id: string) => void
  onCitationClick?: (chunk: ChunkRef) => void
}

// Handles both [CHUNK:uuid] and 【CHUNK:uuid】 (LLM may use either bracket style)
function parseCitations(content: string): string[] {
  const pattern = /[\[【]CHUNK:([a-f0-9-]+)[\]】]/g
  const ids: string[] = []
  let match
  while ((match = pattern.exec(content)) !== null) ids.push(match[1])
  return Array.from(new Set(ids))
}

function cleanContent(content: string): string {
  return content.replace(/[\[【]CHUNK:[a-f0-9-]+[\]】]\s*/g, '').trim()
}

export function ChatInterface({
  workspaceId,
  conversationId,
  initialMessages,
  hasDocuments = false,
  onConversationCreate,
  onCitationClick,
}: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: '/api/chat',
      initialMessages,
      body: { workspaceId, conversationId },
      onResponse: (response) => {
        const newConvoId = response.headers.get('x-conversation-id')
        if (newConvoId && onConversationCreate) onConversationCreate(newConvoId)
      },
    })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return
      handleSubmit(e)
    },
    [input, isLoading, handleSubmit]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-medium text-sm">Ask about your documents</p>
              <p className="text-muted-foreground text-xs mt-1">
                Upload PDFs in the sidebar, then start a conversation
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const citationIds = parseCitations(message.content)
          const cleanText = cleanContent(message.content)
          const isUser = message.role === 'user'

          return (
            <div
              key={message.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}

              <div className={`max-w-[75%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bubble-user rounded-tr-sm shadow-sm'
                      : 'bg-secondary text-foreground rounded-tl-sm border border-border'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{cleanText}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-table:text-xs prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {cleanText}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {!isUser && citationIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {citationIds.map((chunkId) => (
                      <CitationCard
                        key={chunkId}
                        citation={{
                          chunk_id: chunkId,
                          document_id: '',
                          document_name: 'Source',
                          page_num: 0,
                          chunk_index: 0,
                          content: '',
                        }}
                        onClick={onCitationClick}
                      />
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-muted border border-border flex items-center justify-center mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-secondary border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-sm text-center text-xs text-destructive bg-destructive/10 rounded-xl px-4 py-2.5 border border-destructive/20">
            {error.message}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        {!hasDocuments && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            Upload a PDF to start chatting
          </p>
        )}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={hasDocuments ? 'Ask a question… (Enter to send, Shift+Enter for newline)' : 'Upload a PDF first…'}
            rows={1}
            disabled={isLoading || !hasDocuments}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 disabled:opacity-50 max-h-32 transition-colors scrollbar-thin"
            style={{ minHeight: '42px' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !hasDocuments}
            className="flex-shrink-0 p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-85 disabled:opacity-30 transition-opacity shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

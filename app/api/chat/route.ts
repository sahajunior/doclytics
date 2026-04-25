import { NextRequest } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { retrieveChunks } from '@/lib/retrieval'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import type { ChunkRef } from '@/lib/types'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

export const maxDuration = 60

function buildSystemPrompt(chunks: ChunkRef[]): string {
  const contextBlocks = chunks
    .map(
      (c) =>
        `[CHUNK:${c.chunk_id}] (Source: ${c.document_name}, Page ${c.page_num})\n${c.content}`
    )
    .join('\n\n---\n\n')

  return `You are a helpful assistant that answers questions based on the provided document context.

When answering:
1. Base your answer primarily on the provided context below.
2. When you reference information from a specific chunk, cite it using the marker [CHUNK:chunk_id] inline.
3. If the context does not contain enough information to answer the question, say so clearly.
4. Be concise and accurate.

Context:
${contextBlocks}`
}

function extractCitations(content: string, chunks: ChunkRef[]): ChunkRef[] {
  const citedIds = new Set<string>()
  const pattern = /\[CHUNK:([a-f0-9-]+)\]/g
  let match

  while ((match = pattern.exec(content)) !== null) {
    citedIds.add(match[1])
  }

  return chunks.filter((c) => citedIds.has(c.chunk_id))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, conversationId, workspaceId } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      conversationId?: string
      workspaceId: string
    }

    if (!messages || messages.length === 0 || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: messages, workspaceId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the last user message for retrieval
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user')

    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Retrieve relevant chunks
    const retrievedChunks = await retrieveChunks(
      lastUserMessage.content,
      workspaceId,
      4
    )

    if (retrievedChunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No relevant content found. Upload documents to this workspace before asking questions.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = buildSystemPrompt(retrievedChunks)

    // Ensure we have or create a conversation
    const supabase = createSupabaseAdmin()
    let activeConversationId = conversationId

    if (!activeConversationId) {
      const title =
        lastUserMessage.content.slice(0, 60) +
        (lastUserMessage.content.length > 60 ? '...' : '')

      const { data: newConvo, error: convoError } = await supabase
        .from('conversations')
        .insert({ workspace_id: workspaceId, title })
        .select()
        .single()

      if (convoError || !newConvo) {
        console.error('Failed to create conversation:', convoError)
      } else {
        activeConversationId = newConvo.id
      }
    }

    // Persist user message
    if (activeConversationId) {
      await supabase.from('messages').insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: lastUserMessage.content,
        citations: [],
      })
    }

    // Stream response
    const result = await streamText({
      model: openrouter('nvidia/nemotron-3-super-120b-a12b:free'),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      onFinish: async ({ text }) => {
        if (activeConversationId) {
          const citations = extractCitations(text, retrievedChunks)
          await supabase.from('messages').insert({
            conversation_id: activeConversationId,
            role: 'assistant',
            content: text,
            citations: citations,
          })
        }
      },
    })

    return result.toDataStreamResponse({
      headers: activeConversationId
        ? { 'x-conversation-id': activeConversationId }
        : undefined,
    })
  } catch (error) {
    console.error('Chat route error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

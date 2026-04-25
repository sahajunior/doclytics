import { embedText } from '@/lib/embeddings'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import type { ChunkRef } from '@/lib/types'

export async function retrieveChunks(
  query: string,
  workspaceId: string,
  topK: number = 4,
  documentIds?: string[],
  similarityThreshold: number = 0.3
): Promise<ChunkRef[]> {
  const queryEmbedding = await embedText(query)

  const supabase = createSupabaseAdmin()

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    workspace_id: workspaceId,
    match_count: topK,
  })

  if (error) {
    console.error('Error retrieving chunks:', error)
    throw new Error(`Failed to retrieve chunks: ${error.message}`)
  }

  let results = (data ?? []) as Array<{
    chunk_id: string
    document_id: string
    document_name: string
    page_num: number
    chunk_index: number
    content: string
    similarity: number
  }>

  results = results.filter((r) => r.similarity >= similarityThreshold)

  if (documentIds && documentIds.length > 0) {
    results = results.filter((r) => documentIds.includes(r.document_id))
  }

  return results.map((r) => ({
    chunk_id: r.chunk_id,
    document_id: r.document_id,
    document_name: r.document_name,
    page_num: r.page_num,
    chunk_index: r.chunk_index,
    content: r.content,
  }))
}

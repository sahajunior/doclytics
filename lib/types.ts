export interface Workspace {
  id: string
  name: string
  description: string
  created_at: string
  user_id: string
}

export interface Document {
  id: string
  workspace_id: string
  name: string
  file_path: string
  file_size: number
  created_at: string
}

export interface Chunk {
  id: string
  document_id: string
  workspace_id: string
  content: string
  page_num: number
  chunk_index: number
  embedding: number[]
}

export interface Conversation {
  id: string
  workspace_id: string
  title: string
  created_at: string
  share_token: string | null
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  citations: ChunkRef[]
  created_at: string
}

export interface ChunkRef {
  chunk_id: string
  document_id: string
  document_name: string
  page_num: number
  chunk_index: number
  content: string
}

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  user_id     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_size    BIGINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  page_num     INTEGER NOT NULL DEFAULT 1,
  chunk_index  INTEGER NOT NULL DEFAULT 0,
  embedding    vector(3072),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'New Conversation',
  share_token  TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  citations       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────


CREATE INDEX IF NOT EXISTS chunks_workspace_idx ON chunks (workspace_id);
CREATE INDEX IF NOT EXISTS documents_workspace_idx ON documents (workspace_id);
CREATE INDEX IF NOT EXISTS conversations_workspace_idx ON conversations (workspace_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id);

-- ─────────────────────────────────────────────
-- Similarity search function
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(3072),
  workspace_id    UUID,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id      UUID,
  document_id   UUID,
  document_name TEXT,
  page_num      INT,
  chunk_index   INT,
  content       TEXT,
  similarity    FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id                            AS chunk_id,
    c.document_id,
    d.name                          AS document_name,
    c.page_num,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN documents d ON d.id = c.document_id
  WHERE c.workspace_id = match_chunks.workspace_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

ALTER TABLE workspaces    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- workspaces: owner access
CREATE POLICY "workspaces_owner" ON workspaces
  FOR ALL USING (auth.uid()::text = user_id);

-- documents: access via workspace ownership
CREATE POLICY "documents_owner" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = documents.workspace_id
        AND w.user_id = auth.uid()::text
    )
  );

-- chunks: access via workspace ownership
CREATE POLICY "chunks_owner" ON chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = chunks.workspace_id
        AND w.user_id = auth.uid()::text
    )
  );

-- conversations: access via workspace ownership
CREATE POLICY "conversations_owner" ON conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = conversations.workspace_id
        AND w.user_id = auth.uid()::text
    )
  );

-- messages: access via conversation → workspace ownership
CREATE POLICY "messages_owner" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM conversations cv
      JOIN workspaces w ON w.id = cv.workspace_id
      WHERE cv.id = messages.conversation_id
        AND w.user_id = auth.uid()::text
    )
  );

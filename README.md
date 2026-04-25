# Doclytics — RAG Document Q&A

A production-grade **Retrieval-Augmented Generation** (RAG) system that lets you upload PDFs and ask questions grounded in their content. Built to demonstrate full-stack AI system design: ingestion, vector search, context injection, and streaming LLM generation.

## Architecture

```
User Query
    │
    ▼
Embed query (OpenAI text-embedding-3-small)
    │
    ▼
pgvector cosine similarity search (Supabase)
    │
    ▼
Top-K chunks retrieved (similarity threshold filtered)
    │
    ▼
Chunks injected into system prompt
    │
    ▼
LLM generates grounded response (OpenRouter / Nemotron)
    │
    ▼
Streamed to client with inline citations [CHUNK:id]
```

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (PostgreSQL + pgvector) |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenRouter (nvidia/nemotron-super-120b) |
| Streaming | Vercel AI SDK `streamText` |
| UI | Tailwind CSS + shadcn/ui |
| Deployment | Netlify + `@netlify/plugin-nextjs` |

## RAG Pipeline Detail

**Ingestion** (`/api/upload`)
- PDF parsed with `unpdf`
- Text split into ~500-token chunks with 50-token overlap
- Each chunk embedded and stored in Supabase `chunks` table with pgvector

**Retrieval** (`lib/retrieval.ts`)
- Query embedded at request time
- `match_chunks` Postgres function runs cosine similarity search
- Results filtered by similarity threshold (≥ 0.3) before prompt injection

**Generation** (`/api/chat`)
- Retrieved chunks formatted as numbered context blocks with source metadata
- Model instructed to cite `[CHUNK:id]` inline — responses are traceable
- Response streamed via Vercel AI SDK; citations persisted to DB on finish

## Local Setup

```bash
cp .env.local.example .env.local
# Fill in values (see below)
npm install
npm run dev
```

### Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
```

> **Security:** `SUPABASE_SERVICE_ROLE_KEY` and `OPENROUTER_API_KEY` are server-only. Never prefixed with `NEXT_PUBLIC_`. Client never accesses external APIs directly.

## Supabase Setup

Enable `pgvector` extension, then run:

```sql
create extension if not exists vector;

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  storage_path text not null,
  created_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  page_num int,
  chunk_index int,
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb default '[]',
  created_at timestamptz default now()
);

create or replace function match_chunks(
  query_embedding vector(1536),
  workspace_id uuid,
  match_count int default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  page_num int,
  chunk_index int,
  content text,
  similarity float
)
language sql stable as $$
  select
    c.id as chunk_id,
    c.document_id,
    d.name as document_name,
    c.page_num,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where c.workspace_id = match_chunks.workspace_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

## Deploy to Netlify

1. Push repo (`.env.local` is gitignored — never committed)
2. Connect repo in Netlify dashboard
3. Add environment variables in Netlify → Site Settings → Environment Variables
4. Deploy — `@netlify/plugin-nextjs` handles serverless function routing automatically

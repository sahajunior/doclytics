import { google } from '@ai-sdk/google'
import { embed, embedMany } from 'ai'

const docModel = google.textEmbeddingModel('gemini-embedding-001')
const queryModel = google.textEmbeddingModel('gemini-embedding-001')

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: queryModel, value: text })
  return embedding
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const { embeddings } = await embedMany({ model: docModel, values: batch })
    results.push(...embeddings)
  }

  return results
}

/**
 * Recursive text splitter that splits on paragraphs, then sentences, then words.
 * Maintains overlap between chunks for context continuity.
 */

function estimateTokens(text: string): number {
  // 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

function splitOnSeparators(text: string, separators: string[]): string[] {
  if (separators.length === 0) {
    // Split into individual characters as last resort
    return text.split('')
  }

  const separator = separators[0]
  const remaining = separators.slice(1)

  const parts = text.split(separator).filter((p) => p.trim().length > 0)

  if (parts.length <= 1) {
    return splitOnSeparators(text, remaining)
  }

  return parts
}

function mergeChunks(
  splits: string[],
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  let currentTokens = 0

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i]
    const splitTokens = estimateTokens(split)

    if (currentTokens + splitTokens > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())

      // Build overlap from the end of the current chunk
      const overlapText = buildOverlap(currentChunk, overlap)
      currentChunk = overlapText + ' ' + split
      currentTokens = estimateTokens(currentChunk)
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + split : split
      currentTokens += splitTokens
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

function buildOverlap(text: string, overlapTokens: number): string {
  const targetChars = overlapTokens * 4
  if (text.length <= targetChars) {
    return text
  }
  return text.slice(text.length - targetChars)
}

export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const totalTokens = estimateTokens(text)
  if (totalTokens <= chunkSize) {
    return [text.trim()]
  }

  // Separators in order of preference: paragraph, sentence, word
  const separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ']

  // Try paragraph splits first
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)

  if (paragraphs.length > 1) {
    const subChunks: string[] = []
    for (const para of paragraphs) {
      const paraTokens = estimateTokens(para)
      if (paraTokens <= chunkSize) {
        subChunks.push(para.trim())
      } else {
        // Recursively chunk large paragraphs
        const subSplits = chunkText(para, chunkSize, overlap)
        subChunks.push(...subSplits)
      }
    }
    return mergeChunks(subChunks, chunkSize, overlap)
  }

  // Try sentence splits
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0)

  if (sentences.length > 1) {
    const subChunks: string[] = []
    for (const sentence of sentences) {
      const sentTokens = estimateTokens(sentence)
      if (sentTokens <= chunkSize) {
        subChunks.push(sentence.trim())
      } else {
        // Recursively chunk large sentences
        const subSplits = chunkText(sentence, chunkSize, overlap)
        subChunks.push(...subSplits)
      }
    }
    return mergeChunks(subChunks, chunkSize, overlap)
  }

  // Fall back to word splits
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  return mergeChunks(words, chunkSize, overlap)
}

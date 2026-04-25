import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { embedBatch } from '@/lib/embeddings'
import { chunkText } from '@/lib/chunker'

const TEST_USER_ID = process.env.DEPLOY_USER_ID ?? 'demo-user'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const workspaceId = formData.get('workspaceId') as string | null

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: file and workspaceId' },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    // 1. Upload raw PDF to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(fileBuffer)
    const filePath = `${TEST_USER_ID}/${workspaceId}/${Date.now()}_${file.name}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      return NextResponse.json(
        { error: `Failed to upload file: ${storageError.message}` },
        { status: 500 }
      )
    }

    // 2. Insert document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
      })
      .select()
      .single()

    if (docError || !document) {
      console.error('Document insert error:', docError)
      return NextResponse.json(
        { error: `Failed to create document record: ${docError?.message}` },
        { status: 500 }
      )
    }

    // 3. Extract text from PDF using pdf-parse
    // Dynamic import to avoid issues with Next.js server components
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(Buffer.from(fileBuffer))
    const totalPages = pdfData.numpages
    const fullText = pdfData.text
    const totalChars = fullText.length

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400 }
      )
    }

    // 4. Chunk text
    const rawChunks = chunkText(fullText, 500, 50)

    if (rawChunks.length === 0) {
      return NextResponse.json(
        { error: 'No text chunks produced from PDF' },
        { status: 400 }
      )
    }

    // 5. Batch embed all chunks
    const embeddings = await embedBatch(rawChunks)

    // 6. Bulk insert into chunks table
    const chunkRows = rawChunks.map((content, index) => {
      // Approximate page number based on character offset
      // We track cumulative char offset by joining chunks up to this index
      const charOffset = rawChunks.slice(0, index).join(' ').length
      const pageNum =
        totalChars > 0
          ? Math.min(
              Math.ceil((charOffset / totalChars) * totalPages) || 1,
              totalPages
            )
          : 1

      return {
        document_id: document.id,
        workspace_id: workspaceId,
        content,
        page_num: pageNum,
        chunk_index: index,
        embedding: embeddings[index],
      }
    })

    const { error: chunksError } = await supabase
      .from('chunks')
      .insert(chunkRows)

    if (chunksError) {
      console.error('Chunks insert error:', chunksError)
      return NextResponse.json(
        { error: `Failed to store chunks: ${chunksError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      documentId: document.id,
      chunkCount: rawChunks.length,
      pageCount: totalPages,
    })
  } catch (error) {
    console.error('Upload route error:', error)
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    )
  }
}

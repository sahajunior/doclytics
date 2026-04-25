'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface UploadButtonProps {
  workspaceId: string
  onUploadComplete?: () => void
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function UploadButton({ workspaceId, onUploadComplete }: UploadButtonProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')
    setProgress('Uploading PDF...')
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', workspaceId)

      setProgress('Extracting and embedding text...')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Upload failed')
      }

      setStatus('success')
      setProgress(`Done! ${data.chunkCount} chunks indexed.`)
      onUploadComplete?.()

      // Reset after 3s
      setTimeout(() => {
        setStatus('idle')
        setProgress('')
        if (inputRef.current) inputRef.current.value = ''
      }, 3000)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setTimeout(() => {
        setStatus('idle')
        setErrorMsg('')
        if (inputRef.current) inputRef.current.value = ''
      }, 4000)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
        id="pdf-upload"
        disabled={status === 'uploading'}
      />
      <label
        htmlFor="pdf-upload"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors w-full justify-center
          ${status === 'uploading'
            ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
            : status === 'success'
            ? 'border-green-500/30 bg-green-500/10 text-green-600'
            : status === 'error'
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-border bg-background hover:bg-accent text-foreground'
          }`}
      >
        {status === 'idle' && (
          <>
            <Upload className="w-3.5 h-3.5" />
            Upload PDF
          </>
        )}
        {status === 'uploading' && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="truncate">{progress}</span>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="truncate">{progress}</span>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="truncate">{errorMsg}</span>
          </>
        )}
      </label>
    </div>
  )
}

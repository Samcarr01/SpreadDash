'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { LIMITS } from '@/types'
import UploadProgress from './UploadProgress'
import { useRouter } from 'next/navigation'

export default function DropZone() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [uploadedBy, setUploadedBy] = useState('Team')
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'parsing' | 'analysing' | 'complete' | 'error'
  >('idle')
  const [uploadProgress, setUploadProgress] = useState(0)

  const validateFile = (file: File): string | null => {
    // Check extension
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!LIMITS.ALLOWED_EXTENSIONS.includes(extension as any)) {
      return `Invalid file type. Allowed: ${LIMITS.ALLOWED_EXTENSIONS.join(', ')}`
    }

    // Check size
    if (file.size > LIMITS.MAX_UPLOAD_SIZE_BYTES) {
      return `File too large. Max size: ${LIMITS.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB`
    }

    return null
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const error = validateFile(droppedFile)
      if (error) {
        setError(error)
      } else {
        setFile(droppedFile)
        setError(null)
      }
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const error = validateFile(selectedFile)
      if (error) {
        setError(error)
      } else {
        setFile(selectedFile)
        setError(null)
      }
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    setError(null)
    setUploadStatus('uploading')
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (label) formData.append('label', label)
      formData.append('uploadedBy', uploadedBy)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      setUploadProgress(50)
      setUploadStatus('parsing')

      await new Promise((resolve) => setTimeout(resolve, 500))

      setUploadProgress(75)
      setUploadStatus('analysing')

      await new Promise((resolve) => setTimeout(resolve, 500))

      const data = await response.json()
      setUploadProgress(100)
      setUploadStatus('complete')

      // Redirect to the new upload's dashboard
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.push(`/dashboard/${data.data.id}`)
      // Refresh after navigation so shared layout (sidebar) refetches uploads.
      router.refresh()
    } catch (err) {
      setUploadStatus('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const handleReset = () => {
    setFile(null)
    setLabel('')
    setUploadedBy('Team')
    setError(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (uploadStatus !== 'idle' && uploadStatus !== 'error') {
    return (
      <Card className="surface-panel p-8">
        <UploadProgress
          status={uploadStatus}
          progress={uploadProgress}
          filename={file?.name}
        />
      </Card>
    )
  }

  return (
    <Card className="surface-panel p-6 md:p-8">
      <div className="mb-5">
        <p className="kicker">Upload Pipeline</p>
        <h3 className="mt-1 text-2xl font-semibold">Add New Spreadsheet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag and drop a file or browse from your computer. We support CSV and Excel up to 25 MB.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors md:p-12 ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60 hover:bg-primary/5'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={(e) => {
              e.stopPropagation()
              handleReset()
            }}>
              Choose different file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">
                Drag and drop your spreadsheet here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              .xlsx, .xls, .csv • Max {LIMITS.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB
            </p>
          </div>
        )}
      </div>

      {/* Optional Fields */}
      {file && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="label" className="text-xs uppercase tracking-wider text-muted-foreground">Label (Optional)</Label>
            <Input
              id="label"
              placeholder="e.g., Q1 2024 Sales Report"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-2 h-10 border-border/70 bg-background/80"
            />
          </div>

          <div>
            <Label htmlFor="uploadedBy" className="text-xs uppercase tracking-wider text-muted-foreground">Uploaded By</Label>
            <Input
              id="uploadedBy"
              placeholder="Team"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              className="mt-2 h-10 border-border/70 bg-background/80"
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full md:col-span-2 h-11 font-semibold"
            disabled={!file}
          >
            Upload & Analyze
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{error}</p>
            {uploadStatus === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="mt-2"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

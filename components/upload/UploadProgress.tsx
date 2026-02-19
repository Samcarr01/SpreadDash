import { Progress } from '@/components/ui/progress'
import { FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react'

interface UploadProgressProps {
  status: 'uploading' | 'parsing' | 'analysing' | 'complete'
  progress: number
  filename?: string
}

export default function UploadProgress({
  status,
  progress,
  filename,
}: UploadProgressProps) {
  const statusMessages = {
    uploading: 'Uploading file...',
    parsing: 'Parsing spreadsheet...',
    analysing: 'Generating insights...',
    complete: 'Complete!',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {status === 'complete' ? (
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        ) : (
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        )}
        <div className="flex-1">
          <p className="font-medium">{statusMessages[status]}</p>
          {filename && (
            <p className="text-sm text-muted-foreground">{filename}</p>
          )}
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress}%</span>
        <span>
          {status === 'uploading' && 'Uploading to server'}
          {status === 'parsing' && 'Reading columns and data types'}
          {status === 'analysing' && 'Running AI analysis'}
          {status === 'complete' && 'Redirecting...'}
        </span>
      </div>
    </div>
  )
}

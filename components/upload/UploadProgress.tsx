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
  const steps = ['uploading', 'parsing', 'analysing', 'complete'] as const
  const activeIndex = steps.indexOf(status)

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
          <p className="font-semibold">{statusMessages[status]}</p>
          {filename && (
            <p className="text-sm text-muted-foreground">{filename}</p>
          )}
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`rounded-md border px-2 py-1 text-center text-[11px] font-medium ${
              index <= activeIndex
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/70 bg-[hsl(var(--bg-raised)/0.7)] text-muted-foreground'
            }`}
          >
            {step === 'uploading' && 'Upload'}
            {step === 'parsing' && 'Parse'}
            {step === 'analysing' && 'Analyze'}
            {step === 'complete' && 'Done'}
          </div>
        ))}
      </div>

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

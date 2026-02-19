'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('History error:', error)
  }, [error])

  return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <Card className="p-8 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load history</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We encountered an error loading the upload history. Please try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </div>
  )
}

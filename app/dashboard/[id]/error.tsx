'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DashboardDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard detail error:', error)
  }, [error])

  return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <Card className="p-8 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We couldn't load this dashboard. The upload may not exist or there was an error fetching the data.
        </p>
        <div className="flex gap-2 justify-center">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Button onClick={reset}>Try again</Button>
        </div>
      </Card>
    </div>
  )
}

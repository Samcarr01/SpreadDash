'use client'

import { useState } from 'react'
import { UploadRecord } from '@/types'
import AISummaryCard from './AISummaryCard'
import InsightPanel from './InsightPanel'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AIInsightsPanelProps {
  upload: UploadRecord
}

export default function AIInsightsPanel({ upload }: AIInsightsPanelProps) {
  const router = useRouter()
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/uploads/${upload.id}/analyse`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh the page data
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Failed to regenerate AI analysis:', data.error)
        alert('Failed to regenerate AI analysis. Please try again.')
      }
    } catch (error) {
      console.error('Error regenerating AI analysis:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleRetry = () => {
    handleRegenerate()
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">AI Analysis</h2>
          {upload.ai_status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          )}
        </div>
        <AISummaryCard
          aiAnalysis={upload.ai_analysis}
          aiStatus={upload.ai_status}
          onRetry={handleRetry}
        />
      </div>

      {/* Rule-Based Insights Section */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Detected Insights</h2>
        {upload.insights_data && upload.insights_data.insights.length > 0 ? (
          <InsightPanel insights={upload.insights_data.insights} />
        ) : (
          <div className="surface-panel py-8 text-center text-muted-foreground">
            <p>No insights generated for this dataset</p>
          </div>
        )}
      </div>
    </div>
  )
}

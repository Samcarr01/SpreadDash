'use client'

import { AIAnalysisResult, AIStatus } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Lightbulb,
  Zap,
  ArrowRight,
  Target,
  TrendingUp,
} from 'lucide-react'

interface AISummaryCardProps {
  aiAnalysis: AIAnalysisResult | null
  aiStatus: AIStatus
  onRetry?: () => void
}

export default function AISummaryCard({
  aiAnalysis,
  aiStatus,
  onRetry,
}: AISummaryCardProps) {
  // Loading state
  if (aiStatus === 'pending') {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold">AI Analysis</h3>
          <Badge variant="secondary" className="ml-auto">
            Generating...
          </Badge>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
    )
  }

  // Failed or skipped state
  if (aiStatus === 'failed' || aiStatus === 'skipped' || !aiAnalysis) {
    return (
      <Card className="p-6 border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              AI Analysis Unavailable
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {aiStatus === 'skipped'
                ? 'AI analysis is not configured for this instance.'
                : 'AI analysis failed to generate. The rule-based insights below are still available.'}
            </p>
          </div>
          {onRetry && aiStatus === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex-shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </Card>
    )
  }

  // Success state
  return (
    <Card className="p-6 border-blue-200 dark:border-blue-900">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold">AI Analysis</h3>
        <Badge variant="secondary" className="ml-auto">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-generated
        </Badge>
      </div>

      {/* Executive Summary */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          Executive Summary
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {aiAnalysis.executiveSummary}
        </p>
      </div>

      {/* Key Takeaways */}
      {aiAnalysis.keyTakeaways && aiAnalysis.keyTakeaways.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <TrendingUp className="h-4 w-4" />
            Key Takeaways
          </h4>
          <ul className="space-y-2">
            {aiAnalysis.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span className="text-blue-800 dark:text-blue-200">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cross-Column Patterns */}
      {aiAnalysis.crossColumnPatterns.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Key Patterns
          </h4>
          <ul className="space-y-2">
            {aiAnalysis.crossColumnPatterns.map((pattern, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Wins & Next Steps Grid */}
      {((aiAnalysis.quickWins && aiAnalysis.quickWins.length > 0) ||
        (aiAnalysis.nextSteps && aiAnalysis.nextSteps.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Quick Wins */}
          {aiAnalysis.quickWins && aiAnalysis.quickWins.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                <Zap className="h-4 w-4" />
                Quick Wins
              </h4>
              <ul className="space-y-2">
                {aiAnalysis.quickWins.map((win, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400">→</span>
                    <span className="text-green-700 dark:text-green-300">{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {aiAnalysis.nextSteps && aiAnalysis.nextSteps.length > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <ArrowRight className="h-4 w-4" />
                Next Steps
              </h4>
              <ul className="space-y-2">
                {aiAnalysis.nextSteps.map((step, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="text-purple-600 dark:text-purple-400 font-medium">{index + 1}.</span>
                    <span className="text-purple-700 dark:text-purple-300">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Items */}
      {aiAnalysis.actionItems.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            Recommended Actions
          </h4>
          <ul className="space-y-2">
            {aiAnalysis.actionItems.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                  {index + 1}
                </div>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Data Quality Concerns */}
      {aiAnalysis.dataQualityConcerns.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            Data Quality Notes
          </h4>
          <div className="space-y-2">
            {aiAnalysis.dataQualityConcerns.map((concern, index) => (
              <div
                key={index}
                className="flex gap-2 text-sm p-2 rounded bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900"
              >
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-900 dark:text-yellow-100">
                  {concern}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

import { Insight } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface InsightPanelProps {
  insights: Insight[]
}

export default function InsightPanel({ insights }: InsightPanelProps) {
  if (!insights || insights.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No insights generated
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const { icon: Icon, color, bgColor } = getInsightStyle(insight.severity)

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold">{insight.title}</h4>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {formatInsightType(insight.type)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {insight.description}
          </p>
          {insight.relatedColumns.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {insight.relatedColumns.map((column) => (
                <Badge key={column} variant="secondary" className="text-xs">
                  {column}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function getInsightStyle(severity: Insight['severity']) {
  switch (severity) {
    case 'positive':
      return {
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-950',
      }
    case 'negative':
      return {
        icon: XCircle,
        color: 'text-red-600 dark:text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950',
      }
    case 'warning':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600 dark:text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      }
    case 'info':
      return {
        icon: Info,
        color: 'text-blue-600 dark:text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
      }
  }
}

function formatInsightType(type: Insight['type']): string {
  const typeMap: Record<Insight['type'], string> = {
    biggest_mover_up: 'Top Performer',
    biggest_mover_down: 'Declining',
    high_volatility: 'Volatile',
    flatline: 'Stable',
    outlier: 'Outlier',
    correlation: 'Correlation',
  }
  return typeMap[type] || type
}

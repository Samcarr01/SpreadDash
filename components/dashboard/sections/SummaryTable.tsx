import { Card } from '@/components/ui/card'
import { ChannelMetric } from './ChannelGrid'

interface SummaryTableProps {
  metrics: ChannelMetric[]
  periodLabels: string[]
  periodType: string
}

export default function SummaryTable({
  metrics,
  periodLabels,
  periodType,
}: SummaryTableProps) {
  if (metrics.length === 0) {
    return null
  }

  return (
    <Card className="surface-panel p-5 md:p-6">
      <p className="kicker mb-1">Reference</p>
      <h3 className="mb-4 text-xl font-semibold">
        Channel Summary by {periodType === 'month' ? 'Month' : periodType === 'quarter' ? 'Quarter' : 'Period'}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border/80 text-left">
              <th className="px-2 py-2 font-semibold">Channel</th>
              {periodLabels.map((period) => (
                <th key={period} className="px-2 py-2 text-right font-semibold">
                  {period}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold">Total</th>
              <th className="px-2 py-2 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => (
              <tr
                key={metric.name}
                className={`border-b border-border/60 ${index % 2 === 1 ? 'bg-[hsl(var(--bg-raised)/0.4)]' : ''}`}
              >
                <td className="px-2 py-2 font-medium">{metric.name}</td>
                {metric.sparkline.map((value, valueIndex) => (
                  <td key={`${metric.name}-${valueIndex}`} className="px-2 py-2 text-right">
                    {value.toLocaleString()}
                  </td>
                ))}
                <td className="px-2 py-2 text-right font-semibold">
                  {metric.sparkline.reduce((acc, current) => acc + current, 0).toLocaleString()}
                </td>
                <td
                  className={`px-2 py-2 text-right font-semibold ${
                    metric.change > 0 ? 'text-emerald-500' : metric.change < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

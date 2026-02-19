import { Card } from '@/components/ui/card'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'

export interface ChannelMetric {
  name: string
  currentValue: number
  previousValue: number
  change: number
  trend: 'up' | 'down' | 'flat'
  sparkline: number[]
}

interface ChannelGridProps {
  metrics: ChannelMetric[]
  title?: string
}

export default function ChannelGrid({
  metrics,
  title = 'Channel Health',
}: ChannelGridProps) {
  if (metrics.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.name} className="surface-card p-4">
            <p className="text-label truncate">{metric.name}</p>
            <p className="mt-1 text-2xl font-semibold">{metric.currentValue.toLocaleString()}</p>
            <div className="mt-3 flex items-center justify-between">
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  metric.trend === 'up'
                    ? 'text-emerald-500'
                    : metric.trend === 'down'
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                }`}
              >
                {metric.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : metric.trend === 'down' ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>{metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%</span>
              </div>

              {metric.sparkline.length > 0 && (
                <div className="h-8 w-16">
                  <ResponsiveContainer width="100%" height="100%" minWidth={60} minHeight={28}>
                    <LineChart data={metric.sparkline.map((value, index) => ({ index, value }))}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={
                          metric.trend === 'up'
                            ? '#009E73'
                            : metric.trend === 'down'
                            ? '#D55E00'
                            : '#999999'
                        }
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

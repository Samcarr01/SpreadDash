'use client'

import { KPICard as KPICardType, TREND_COLOURS } from '@/types'
import { Card } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KPICardGridProps {
  kpis: KPICardType[]
}

export default function KPICardGrid({ kpis }: KPICardGridProps) {
  if (!kpis || kpis.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No KPIs available
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.columnName} kpi={kpi} />
      ))}
    </div>
  )
}

function KPICard({ kpi }: { kpi: KPICardType }) {
  const trendColor = TREND_COLOURS[kpi.changeDirection]
  const TrendIcon =
    kpi.changeDirection === 'up'
      ? ArrowUp
      : kpi.changeDirection === 'down'
      ? ArrowDown
      : Minus

  const sparklineData = kpi.sparklineData.map((value, index) => ({
    index,
    value,
  }))

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-2">
        {/* Column Name */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {kpi.columnName}
        </p>

        {/* Current Value */}
        <p className="text-2xl font-bold">{kpi.formattedCurrent}</p>

        {/* Change & Trend */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: trendColor }}
          >
            <TrendIcon className="h-4 w-4" />
            <span>{kpi.formattedChange}</span>
          </div>

          {/* Sparkline */}
          {sparklineData.length > 0 && (
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={trendColor}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

'use client'

import { Card } from '@/components/ui/card'
import { CHART_COLOURS } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface BarChartCardProps {
  data: Array<Record<string, unknown>>
  xKey: string
  yKeys: string[]
  title?: string
  colours?: readonly string[]
}

export default function BarChartCard({
  data,
  xKey,
  yKeys,
  title,
  colours = CHART_COLOURS,
}: BarChartCardProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          No data available for chart
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey={xKey}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          {yKeys.length > 1 && <Legend />}
          {yKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colours[index % colours.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

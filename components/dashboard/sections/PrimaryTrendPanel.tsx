import { Card } from '@/components/ui/card'
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CHART_AXIS_STYLE,
  CHART_SERIES_COLOURS_ENTERPRISE,
  CHART_TOOLTIP_STYLE,
} from '@/lib/ui-tokens'

interface PrimaryTrendPanelProps {
  title: string
  caption?: string
  data: Array<Record<string, unknown>>
  xAxisKey: string
  seriesKeys: string[]
  chartType?: 'line' | 'area'
}

export default function PrimaryTrendPanel({
  title,
  caption,
  data,
  xAxisKey,
  seriesKeys,
  chartType = 'line',
}: PrimaryTrendPanelProps) {
  if (data.length === 0 || seriesKeys.length === 0) {
    return null
  }

  return (
    <Card className="surface-panel p-5 md:p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker">Primary Trend</p>
          <h2 className="text-2xl font-semibold">{title}</h2>
        </div>
        {caption && (
          <p className="max-w-xl text-[13px] leading-6 text-muted-foreground">{caption}</p>
        )}
      </div>

      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
            <XAxis dataKey={xAxisKey} tick={CHART_AXIS_STYLE} />
            <YAxis tick={CHART_AXIS_STYLE} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />

            {seriesKeys.map((key, index) => {
              const colour = CHART_SERIES_COLOURS_ENTERPRISE[index % CHART_SERIES_COLOURS_ENTERPRISE.length]

              if (chartType === 'area') {
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colour}
                    fill={colour}
                    fillOpacity={0.22}
                    strokeWidth={2.4}
                  />
                )
              }

              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colour}
                  strokeWidth={2.8}
                  dot={{ r: 3, fill: colour }}
                  activeDot={{ r: 5 }}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

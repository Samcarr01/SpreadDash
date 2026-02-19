import { Card } from '@/components/ui/card'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

interface SecondaryChartsProps {
  trendData: Array<Record<string, unknown>>
  trendSeries: string[]
  activityData: Array<Record<string, unknown>>
  activitySeries: string[]
}

export default function SecondaryCharts({
  trendData,
  trendSeries,
  activityData,
  activitySeries,
}: SecondaryChartsProps) {
  if (trendData.length === 0 || trendSeries.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="surface-panel p-5 md:p-6">
        <p className="kicker mb-1">Deep Dive</p>
        <h3 className="mb-4 text-xl font-semibold">Cumulative Performance</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
              <XAxis dataKey="period" tick={CHART_AXIS_STYLE} />
              <YAxis tick={CHART_AXIS_STYLE} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {trendSeries.map((series, index) => {
                const colour = CHART_SERIES_COLOURS_ENTERPRISE[index % CHART_SERIES_COLOURS_ENTERPRISE.length]
                return (
                  <Area
                    key={series}
                    type="monotone"
                    dataKey={series}
                    stackId="channels"
                    stroke={colour}
                    fill={colour}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                )
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="surface-panel p-5 md:p-6">
        <p className="kicker mb-1">Deep Dive</p>
        <h3 className="mb-4 text-xl font-semibold">Performance by Activity</h3>
        {activityData.length === 0 || activitySeries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Activity-level comparison is unavailable for this dataset.
          </p>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                <XAxis dataKey="name" tick={{ ...CHART_AXIS_STYLE, fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={56} />
                <YAxis tick={CHART_AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {activitySeries.map((series, index) => (
                  <Bar
                    key={series}
                    dataKey={series}
                    fill={CHART_SERIES_COLOURS_ENTERPRISE[index % CHART_SERIES_COLOURS_ENTERPRISE.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  )
}

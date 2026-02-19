'use client'

import { UploadRecord, CHART_COLOURS } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DataTable from './DataTable'
import AIInsightsPanel from './AIInsightsPanel'
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Rows,
  Columns,
  Calendar,
  Sparkles,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Activity,
} from 'lucide-react'

interface DashboardTabsProps {
  upload: UploadRecord
}

// Detect if columns follow a time-series pattern like "Website_2", "Website_3", etc.
function detectTimeSeriesColumns(headers: string[]) {
  const pattern = /^(.+?)_(\d+)$/
  const groups: Map<string, { baseName: string; periods: { period: number; column: string }[] }> = new Map()

  headers.forEach((header) => {
    const match = header.match(pattern)
    if (match) {
      const baseName = match[1].replace(/_/g, ' ').trim()
      const period = parseInt(match[2], 10)

      if (!groups.has(baseName)) {
        groups.set(baseName, { baseName, periods: [] })
      }
      groups.get(baseName)!.periods.push({ period, column: header })
    }
  })

  // Only return groups with 2+ time periods
  const validGroups = Array.from(groups.values()).filter((g) => g.periods.length >= 2)
  validGroups.forEach((g) => g.periods.sort((a, b) => a.period - b.period))

  return validGroups
}

// Get the first categorical column (not numeric, not a time-series pattern)
function getRowLabelColumn(headers: string[], data: Record<string, unknown>[]) {
  const pattern = /^(.+?)_\d+$/

  for (const header of headers) {
    // Skip columns that look like time-series
    if (pattern.test(header)) continue

    // Check if it's non-numeric (good for labels)
    const firstValue = data[0]?.[header]
    if (typeof firstValue === 'string' && isNaN(parseFloat(firstValue))) {
      return header
    }
  }

  return headers[0]
}

export default function DashboardTabs({ upload }: DashboardTabsProps) {
  // Detect time-series column groups
  const timeSeriesGroups = useMemo(() => {
    return detectTimeSeriesColumns(upload.sheet_meta.headers)
  }, [upload.sheet_meta.headers])

  // Get the label column (e.g., "Activity" or row names)
  const labelColumn = useMemo(() => {
    return getRowLabelColumn(upload.sheet_meta.headers, upload.raw_data)
  }, [upload.sheet_meta.headers, upload.raw_data])

  // Calculate channel totals and trends for KPI cards
  const channelMetrics = useMemo(() => {
    if (timeSeriesGroups.length === 0) return []

    return timeSeriesGroups.slice(0, 8).map((group) => {
      const allValues: number[] = []
      const periodTotals: { period: number; total: number }[] = []

      group.periods.forEach(({ period, column }) => {
        let total = 0
        upload.raw_data.forEach((row) => {
          const val = parseFloat(String(row[column]))
          if (!isNaN(val)) {
            allValues.push(val)
            total += val
          }
        })
        periodTotals.push({ period, total })
      })

      const latestTotal = periodTotals[periodTotals.length - 1]?.total || 0
      const previousTotal = periodTotals[periodTotals.length - 2]?.total || 0
      const change = previousTotal > 0 ? ((latestTotal - previousTotal) / previousTotal) * 100 : 0

      return {
        name: group.baseName,
        currentValue: latestTotal,
        previousValue: previousTotal,
        change,
        trend: change > 5 ? 'up' : change < -5 ? 'down' : 'flat',
        sparkline: periodTotals.map((p) => p.total),
        periods: group.periods,
      }
    })
  }, [timeSeriesGroups, upload.raw_data])

  // Create time-series chart data
  const timeSeriesChartData = useMemo(() => {
    if (timeSeriesGroups.length === 0) return null

    // Get all unique periods
    const allPeriods = new Set<number>()
    timeSeriesGroups.forEach((g) => g.periods.forEach((p) => allPeriods.add(p.period)))
    const sortedPeriods = Array.from(allPeriods).sort((a, b) => a - b)

    // Build chart data
    return sortedPeriods.map((period) => {
      const dataPoint: Record<string, unknown> = { period: `Period ${period}` }

      timeSeriesGroups.slice(0, 6).forEach((group) => {
        const periodData = group.periods.find((p) => p.period === period)
        if (periodData) {
          let total = 0
          upload.raw_data.forEach((row) => {
            const val = parseFloat(String(row[periodData.column]))
            if (!isNaN(val)) total += val
          })
          dataPoint[group.baseName] = total
        }
      })

      return dataPoint
    })
  }, [timeSeriesGroups, upload.raw_data])

  // Create per-activity breakdown chart data
  const activityChartData = useMemo(() => {
    if (!labelColumn || timeSeriesGroups.length === 0) return null

    // Take first 3 channels for comparison
    const channelsToShow = timeSeriesGroups.slice(0, 3)

    return upload.raw_data.slice(0, 10).map((row) => {
      const dataPoint: Record<string, unknown> = {
        name: String(row[labelColumn]).substring(0, 20),
      }

      channelsToShow.forEach((group) => {
        // Sum all periods for this channel
        let total = 0
        group.periods.forEach(({ column }) => {
          const val = parseFloat(String(row[column]))
          if (!isNaN(val)) total += val
        })
        dataPoint[group.baseName] = total
      })

      return dataPoint
    })
  }, [labelColumn, timeSeriesGroups, upload.raw_data])

  // Fallback for non-time-series data
  const numericColumns = useMemo(() => {
    if (timeSeriesGroups.length > 0) return []

    return upload.sheet_meta.headers.filter((header) => {
      const firstValue = upload.raw_data[0]?.[header]
      return typeof firstValue === 'number' || !isNaN(parseFloat(String(firstValue)))
    }).slice(0, 6)
  }, [upload.raw_data, upload.sheet_meta.headers, timeSeriesGroups])

  const hasTimeSeriesData = timeSeriesGroups.length > 0

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="charts">Charts</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="insights">Insights</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6 mt-6">
        {/* Data Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Rows className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Rows</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{upload.row_count.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Columns className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Channels</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {hasTimeSeriesData ? timeSeriesGroups.length : upload.column_count}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Time Periods</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {hasTimeSeriesData ? timeSeriesGroups[0]?.periods.length || 0 : '-'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Uploaded</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                  {new Date(upload.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Channel Performance Cards */}
        {channelMetrics.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Channel Performance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {channelMetrics.map((metric, idx) => (
                <Card key={metric.name} className="p-4">
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.name}
                    </p>
                    <p className="text-2xl font-bold">{metric.currentValue.toLocaleString()}</p>
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          metric.trend === 'up'
                            ? 'text-green-600'
                            : metric.trend === 'down'
                            ? 'text-red-600'
                            : 'text-gray-500'
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
                        <div className="w-16 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metric.sparkline.map((v, i) => ({ i, v }))}>
                              <Line
                                type="monotone"
                                dataKey="v"
                                stroke={
                                  metric.trend === 'up'
                                    ? '#22c55e'
                                    : metric.trend === 'down'
                                    ? '#ef4444'
                                    : '#6b7280'
                                }
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
              ))}
            </div>
          </div>
        )}

        {/* Time Series Overview Chart */}
        {timeSeriesChartData && timeSeriesChartData.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Over Time
            </h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {timeSeriesGroups.slice(0, 6).map((group, idx) => (
                    <Line
                      key={group.baseName}
                      type="monotone"
                      dataKey={group.baseName}
                      stroke={CHART_COLOURS[idx % CHART_COLOURS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* AI Summary Card */}
        {upload.ai_status === 'completed' && upload.ai_analysis && (
          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100">AI Summary</h2>
                  <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    AI-generated
                  </Badge>
                </div>
                <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">
                  {upload.ai_analysis.executiveSummary}
                </p>
                {upload.ai_analysis.actionItems && upload.ai_analysis.actionItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
                    <p className="font-medium text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Quick Actions
                    </p>
                    <ul className="space-y-1">
                      {upload.ai_analysis.actionItems.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                          <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Quick Insights */}
        {upload.insights_data && upload.insights_data.insights && upload.insights_data.insights.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Quick Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upload.insights_data.insights.slice(0, 3).map((insight) => (
                <Card
                  key={insight.id}
                  className={`p-4 border-l-4 ${
                    insight.severity === 'positive'
                      ? 'border-l-green-500 bg-green-50 dark:bg-green-950/30'
                      : insight.severity === 'negative'
                      ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
                      : insight.severity === 'warning'
                      ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
                      : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  }`}
                >
                  <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* Charts Tab */}
      <TabsContent value="charts" className="space-y-6 mt-6">
        {hasTimeSeriesData ? (
          <>
            {/* Trends Line Chart */}
            {timeSeriesChartData && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Channel Trends Over Time</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      {timeSeriesGroups.slice(0, 6).map((group, idx) => (
                        <Line
                          key={group.baseName}
                          type="monotone"
                          dataKey={group.baseName}
                          stroke={CHART_COLOURS[idx % CHART_COLOURS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Area Chart */}
            {timeSeriesChartData && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Cumulative Performance</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      {timeSeriesGroups.slice(0, 6).map((group, idx) => (
                        <Area
                          key={group.baseName}
                          type="monotone"
                          dataKey={group.baseName}
                          stackId="1"
                          stroke={CHART_COLOURS[idx % CHART_COLOURS.length]}
                          fill={CHART_COLOURS[idx % CHART_COLOURS.length]}
                          fillOpacity={0.6}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Activity Comparison Bar Chart */}
            {activityChartData && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance by Activity</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {timeSeriesGroups.slice(0, 3).map((group, idx) => (
                        <Bar
                          key={group.baseName}
                          dataKey={group.baseName}
                          fill={CHART_COLOURS[idx % CHART_COLOURS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Period Comparison Table */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Channel Summary by Period</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Channel</th>
                      {timeSeriesGroups[0]?.periods.map((p) => (
                        <th key={p.period} className="text-right p-2 font-medium">
                          Period {p.period}
                        </th>
                      ))}
                      <th className="text-right p-2 font-medium">Total</th>
                      <th className="text-right p-2 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelMetrics.map((metric) => (
                      <tr key={metric.name} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{metric.name}</td>
                        {metric.sparkline.map((val, idx) => (
                          <td key={idx} className="text-right p-2">{val.toLocaleString()}</td>
                        ))}
                        <td className="text-right p-2 font-semibold">
                          {metric.sparkline.reduce((a, b) => a + b, 0).toLocaleString()}
                        </td>
                        <td className={`text-right p-2 font-medium ${
                          metric.change > 0 ? 'text-green-600' : metric.change < 0 ? 'text-red-600' : ''
                        }`}>
                          {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          /* Fallback for non-time-series data */
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Limited Chart Data</h3>
            <p className="text-muted-foreground">
              This data doesn&apos;t appear to have time-series columns (like Month_1, Month_2, etc.).
              View the Data tab to explore your spreadsheet.
            </p>
          </Card>
        )}
      </TabsContent>

      {/* Data Tab */}
      <TabsContent value="data" className="mt-6">
        <DataTable
          data={upload.raw_data}
          headers={upload.sheet_meta.headers}
        />
      </TabsContent>

      {/* Insights Tab */}
      <TabsContent value="insights" className="mt-6">
        <AIInsightsPanel upload={upload} />
      </TabsContent>
    </Tabs>
  )
}

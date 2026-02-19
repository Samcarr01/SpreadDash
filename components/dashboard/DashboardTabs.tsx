'use client'

import { UploadRecord, CHART_COLOURS } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import KPICardGrid from './KPICardGrid'
import ChartSwitcher from '../charts/ChartSwitcher'
import DataTable from './DataTable'
import AIInsightsPanel from './AIInsightsPanel'
import ColumnPicker from './ColumnPicker'
import { useState, useMemo } from 'react'
import type { ChartConfig } from '@/types'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileSpreadsheet,
  Rows,
  Columns,
  Calendar,
  Sparkles,
  BarChart3,
  Lightbulb,
  ArrowRight,
} from 'lucide-react'

interface DashboardTabsProps {
  upload: UploadRecord
}

export default function DashboardTabs({ upload }: DashboardTabsProps) {
  const [customChartConfig, setCustomChartConfig] = useState<ChartConfig | null>(null)

  const chartConfig = customChartConfig || {
    xAxisColumn: upload.insights_data?.headlineChart.xAxisColumn || upload.sheet_meta.headers[0],
    yAxisColumns: upload.insights_data?.headlineChart.seriesColumns || [],
    chartType: upload.insights_data?.headlineChart.chartType || 'line',
  }

  // Auto-detect numeric columns for charts
  const numericColumns = useMemo(() => {
    if (!upload.raw_data || upload.raw_data.length === 0) return []

    return upload.sheet_meta.headers.filter((header) => {
      const firstValue = upload.raw_data[0]?.[header]
      return typeof firstValue === 'number' || !isNaN(parseFloat(String(firstValue)))
    })
  }, [upload.raw_data, upload.sheet_meta.headers])

  // Auto-detect categorical columns
  const categoricalColumns = useMemo(() => {
    return upload.sheet_meta.headers.filter(
      (header) => !numericColumns.includes(header)
    )
  }, [upload.sheet_meta.headers, numericColumns])

  // Generate auto chart data
  const autoChartData = useMemo(() => {
    if (numericColumns.length === 0) return null

    // Get first categorical column for X axis, first numeric for Y
    const xColumn = categoricalColumns[0] || upload.sheet_meta.headers[0]
    const yColumns = numericColumns.slice(0, 3) // Up to 3 numeric columns

    return {
      xColumn,
      yColumns,
      data: upload.raw_data.slice(0, 20), // First 20 rows for preview
    }
  }, [upload.raw_data, numericColumns, categoricalColumns, upload.sheet_meta.headers])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const stats: { column: string; sum: number; avg: number; min: number; max: number }[] = []

    numericColumns.slice(0, 4).forEach((col) => {
      const values = upload.raw_data
        .map((row) => parseFloat(String(row[col])))
        .filter((v) => !isNaN(v))

      if (values.length > 0) {
        stats.push({
          column: col,
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
        })
      }
    })

    return stats
  }, [upload.raw_data, numericColumns])

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="charts">Charts</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="insights">Insights</TabsTrigger>
      </TabsList>

      {/* Overview Tab - Redesigned */}
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
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Columns</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{upload.column_count}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Numeric Cols</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{numericColumns.length}</p>
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

        {/* KPI Cards (if available) */}
        {upload.insights_data && upload.insights_data.kpis && upload.insights_data.kpis.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Key Metrics
            </h2>
            <KPICardGrid kpis={upload.insights_data.kpis} />
          </div>
        )}

        {/* Auto-Generated Chart */}
        {autoChartData && autoChartData.yColumns.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Data Overview
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={autoChartData.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey={autoChartData.xColumn}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {autoChartData.yColumns.map((col, idx) => (
                    <Bar
                      key={col}
                      dataKey={col}
                      fill={CHART_COLOURS[idx % CHART_COLOURS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Summary Statistics */}
        {summaryStats.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Summary Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryStats.map((stat) => (
                <div key={stat.column} className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2 truncate" title={stat.column}>
                    {stat.column}
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sum:</span>
                      <span className="font-medium">{stat.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average:</span>
                      <span className="font-medium">{stat.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min:</span>
                      <span className="font-medium">{stat.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max:</span>
                      <span className="font-medium">{stat.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI Summary Card - Improved Design */}
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

      {/* Charts Tab - With Auto Charts */}
      <TabsContent value="charts" className="space-y-6 mt-6">
        {/* Auto-generated Charts */}
        {autoChartData && autoChartData.yColumns.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Bar Chart</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={autoChartData.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey={autoChartData.xColumn} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {autoChartData.yColumns.map((col, idx) => (
                      <Bar key={col} dataKey={col} fill={CHART_COLOURS[idx % CHART_COLOURS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Line Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Line Chart</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={autoChartData.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey={autoChartData.xColumn} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {autoChartData.yColumns.map((col, idx) => (
                      <Line key={col} type="monotone" dataKey={col} stroke={CHART_COLOURS[idx % CHART_COLOURS.length]} strokeWidth={2} dot={{ r: 4 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* Custom Chart Builder */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Chart Builder</h2>
          <ColumnPicker
            sheetMeta={upload.sheet_meta}
            onChange={setCustomChartConfig}
            initialConfig={chartConfig}
          />

          {chartConfig.yAxisColumns.length > 0 ? (
            <div className="mt-6">
              <ChartSwitcher
                data={upload.raw_data}
                config={{
                  chartType: chartConfig.chartType,
                  xAxisColumn: chartConfig.xAxisColumn,
                  seriesColumns: chartConfig.yAxisColumns,
                  title: 'Custom Chart',
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border rounded-lg mt-4 bg-muted/30">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select columns above to create a custom chart</p>
            </div>
          )}
        </Card>
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

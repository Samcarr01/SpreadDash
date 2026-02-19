'use client'

import { UploadRecord } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import DataTable from './DataTable'
import AIInsightsPanel from './AIInsightsPanel'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Lightbulb, Sparkles } from 'lucide-react'
import OverviewHeader from './sections/OverviewHeader'
import PrimaryTrendPanel from './sections/PrimaryTrendPanel'
import ChannelGrid, { ChannelMetric } from './sections/ChannelGrid'
import SecondaryCharts from './sections/SecondaryCharts'
import SummaryTable from './sections/SummaryTable'
import {
  CHART_AXIS_STYLE,
  CHART_MAX_VISIBLE_SERIES,
  CHART_SERIES_COLOURS_ENTERPRISE,
  CHART_TOOLTIP_STYLE,
} from '@/lib/ui-tokens'

interface DashboardTabsProps {
  upload: UploadRecord
}

function detectTimeSeriesColumns(headers: string[]) {
  // Match both number patterns (_1, _2) and letter patterns (_A, _B, _A1, _B1)
  const numberPattern = /^(.+?)_(\d+)$/
  const letterPattern = /^(.+?)_([A-Z])(\d*)$/
  const groups: Map<string, { baseName: string; periods: { period: number; column: string }[] }> = new Map()

  headers.forEach((header) => {
    // Try number pattern first (e.g., Website_1, Website_2)
    let match = header.match(numberPattern)
    if (match) {
      const baseName = match[1].replace(/_/g, ' ').trim()
      const period = parseInt(match[2], 10)

      if (!groups.has(baseName)) {
        groups.set(baseName, { baseName, periods: [] })
      }
      groups.get(baseName)!.periods.push({ period, column: header })
      return
    }

    // Try letter pattern (e.g., Column_A, Column_B, Column_A1)
    match = header.match(letterPattern)
    if (match) {
      const baseName = match[1].replace(/_/g, ' ').trim()
      const letter = match[2]
      const suffix = match[3] ? parseInt(match[3], 10) : 0

      // Convert letter to number: A=1, B=2, ..., Z=26, then A1=27, B1=28, etc.
      const letterValue = letter.charCodeAt(0) - 64 // A=1, B=2, etc.
      const period = suffix * 26 + letterValue

      if (!groups.has(baseName)) {
        groups.set(baseName, { baseName, periods: [] })
      }
      groups.get(baseName)!.periods.push({ period, column: header })
    }
  })

  const validGroups = Array.from(groups.values()).filter((group) => group.periods.length >= 2)
  validGroups.forEach((group) => group.periods.sort((a, b) => a.period - b.period))

  return validGroups
}

function getRowLabelColumn(headers: string[], data: Record<string, unknown>[]) {
  // Skip columns that look like time series (both number and letter patterns)
  const timeSeriesPattern = /^(.+?)_(\d+|[A-Z]\d*)$/

  for (const header of headers) {
    if (timeSeriesPattern.test(header)) continue

    const firstValue = data[0]?.[header]
    if (typeof firstValue === 'string' && isNaN(parseFloat(firstValue))) {
      return header
    }
  }

  return headers[0]
}

function getPeriodLabel(period: number, index: number, periodType: string, aiPeriodLabels: string[], totalPeriods: number = 12) {
  if (aiPeriodLabels[index]) {
    return aiPeriodLabels[index]
  }

  if (periodType === 'month') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    // For datasets with <= 12 periods, assume recent months ending at current month
    // For period numbers 1-12, map directly to months
    if (period >= 1 && period <= 12) {
      return monthNames[period - 1]
    }
    // For larger period numbers (e.g., multi-year data), include year context
    const yearOffset = Math.floor((period - 1) / 12)
    const monthIndex = (period - 1) % 12
    if (yearOffset > 0) {
      return `${monthNames[monthIndex]} Y${yearOffset + 1}`
    }
    return monthNames[monthIndex] || `Month ${period}`
  }

  if (periodType === 'quarter') {
    // Support multi-year quarters
    if (period > 4) {
      const yearOffset = Math.floor((period - 1) / 4)
      const quarterNum = ((period - 1) % 4) + 1
      return `Q${quarterNum} Y${yearOffset + 1}`
    }
    return `Q${period}`
  }

  if (periodType === 'week') {
    return `Week ${period}`
  }

  if (periodType === 'year') {
    return String(period)
  }

  // Default fallback: assume monthly if we don't have a period type
  // This is better than "Period X" which is meaningless
  if (period >= 1 && period <= 12) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return monthNames[period - 1]
  }

  return `Period ${period}`
}

function getInsightTone(severity: string) {
  if (severity === 'positive') return 'border-emerald-500/40 bg-emerald-500/10'
  if (severity === 'negative') return 'border-red-500/40 bg-red-500/10'
  if (severity === 'warning') return 'border-amber-500/40 bg-amber-500/10'
  return 'border-sky-500/40 bg-sky-500/10'
}

/**
 * Detect if data is "transposed" - rows are categories, columns are time periods
 * This happens when:
 * 1. There's only ONE time-series group (e.g., all columns are Column_A, Column_B, Column_C)
 * 2. The first column contains text labels (category names)
 * 3. There are multiple data rows
 */
function detectTransposedData(
  timeSeriesGroups: { baseName: string; periods: { period: number; column: string }[] }[],
  headers: string[],
  data: Record<string, unknown>[],
  labelColumn: string
): boolean {
  // Must have exactly one time-series group
  if (timeSeriesGroups.length !== 1) return false

  // The group should have multiple periods (columns)
  const group = timeSeriesGroups[0]
  if (group.periods.length < 3) return false

  // Check if base name is generic (like "Column")
  const isGenericBaseName = /^(column|col|field|data|value)s?$/i.test(group.baseName)
  if (!isGenericBaseName) return false

  // Must have a valid label column with text values
  if (!labelColumn) return false

  // Check that most rows have text labels (not numbers)
  const textLabelCount = data.filter(row => {
    const label = row[labelColumn]
    return typeof label === 'string' && label.trim() !== '' && isNaN(parseFloat(label))
  }).length

  // At least 50% of rows should have text labels
  return textLabelCount > data.length * 0.5
}

/**
 * Get clean row labels for transposed data, filtering out title/summary rows
 */
function getCleanRowLabels(
  data: Record<string, unknown>[],
  labelColumn: string,
  timeSeriesGroup: { periods: { period: number; column: string }[] }
): { label: string; rowIndex: number }[] {
  const results: { label: string; rowIndex: number }[] = []

  data.forEach((row, index) => {
    const label = row[labelColumn]
    if (typeof label !== 'string' || label.trim() === '') return

    // Skip rows that look like titles or headers (mostly empty numeric columns)
    const numericValues = timeSeriesGroup.periods.filter(({ column }) => {
      const val = row[column]
      return val !== null && val !== undefined && !isNaN(parseFloat(String(val)))
    })

    // Row should have at least 30% of columns with numeric data
    if (numericValues.length < timeSeriesGroup.periods.length * 0.3) return

    // Skip if label looks like a header/title (all caps, contains "total" at start, etc.)
    const cleanLabel = label.trim()
    if (cleanLabel.toUpperCase() === cleanLabel && cleanLabel.length > 10) return

    results.push({ label: cleanLabel, rowIndex: index })
  })

  return results
}

export default function DashboardTabs({ upload }: DashboardTabsProps) {
  const timeSeriesGroups = useMemo(() => detectTimeSeriesColumns(upload.sheet_meta.headers), [upload.sheet_meta.headers])

  const labelColumn = useMemo(
    () => getRowLabelColumn(upload.sheet_meta.headers, upload.raw_data),
    [upload.sheet_meta.headers, upload.raw_data]
  )

  // Detect if data is transposed (rows = categories, columns = time periods)
  const isTransposed = useMemo(
    () => detectTransposedData(timeSeriesGroups, upload.sheet_meta.headers, upload.raw_data, labelColumn),
    [timeSeriesGroups, upload.sheet_meta.headers, upload.raw_data, labelColumn]
  )

  // Get row labels for transposed data
  const transposedRowLabels = useMemo(() => {
    if (!isTransposed || timeSeriesGroups.length === 0) return []
    return getCleanRowLabels(upload.raw_data, labelColumn, timeSeriesGroups[0])
  }, [isTransposed, upload.raw_data, labelColumn, timeSeriesGroups])

  const aiTopMetrics = useMemo(() => upload.ai_analysis?.displayRecommendations?.topMetrics || [], [upload.ai_analysis])

  const aiPeriodLabels = useMemo(() => {
    const labels = upload.ai_analysis?.displayRecommendations?.periodLabels || []
    // Filter out individual bad labels instead of rejecting all if any are bad
    return labels.map((label) => {
      // Check for generic "Period X" patterns - these are useless
      if (/^Period\s*\d+$/i.test(label)) return null
      // Check for empty or whitespace-only labels
      if (!label || !label.trim()) return null
      return label
    }).filter((label): label is string => label !== null)
  }, [upload.ai_analysis])

  const aiPeriodType = useMemo(
    () => upload.ai_analysis?.displayRecommendations?.periodType || 'period',
    [upload.ai_analysis]
  )

  const sortedGroups = useMemo(() => {
    const groups = [...timeSeriesGroups]

    if (aiTopMetrics.length === 0) {
      return groups
    }

    groups.sort((a, b) => {
      const aIndex = aiTopMetrics.findIndex(
        (metric) => a.baseName.toLowerCase().includes(metric.toLowerCase()) || metric.toLowerCase().includes(a.baseName.toLowerCase())
      )
      const bIndex = aiTopMetrics.findIndex(
        (metric) => b.baseName.toLowerCase().includes(metric.toLowerCase()) || metric.toLowerCase().includes(b.baseName.toLowerCase())
      )

      if (aIndex >= 0 && bIndex < 0) return -1
      if (bIndex >= 0 && aIndex < 0) return 1
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
      return 0
    })

    return groups
  }, [timeSeriesGroups, aiTopMetrics])

  const visibleSeriesGroups = useMemo(
    () => sortedGroups.slice(0, CHART_MAX_VISIBLE_SERIES),
    [sortedGroups]
  )

  const allSortedPeriods = useMemo(() => {
    const allPeriods = new Set<number>()
    visibleSeriesGroups.forEach((group) => group.periods.forEach((period) => allPeriods.add(period.period)))
    return Array.from(allPeriods).sort((a, b) => a - b)
  }, [visibleSeriesGroups])

  const periodLabels = useMemo(
    () => allSortedPeriods.map((period, index) => getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels)),
    [allSortedPeriods, aiPeriodType, aiPeriodLabels]
  )

  // For transposed data: series names are row labels, not column group names
  const transposedSeriesNames = useMemo(() => {
    if (!isTransposed) return []
    return transposedRowLabels.slice(0, CHART_MAX_VISIBLE_SERIES).map(r => r.label)
  }, [isTransposed, transposedRowLabels])

  const channelMetrics = useMemo<ChannelMetric[]>(() => {
    if (sortedGroups.length === 0) return []

    // For transposed data: each ROW is a channel/metric
    if (isTransposed && transposedRowLabels.length > 0) {
      const group = sortedGroups[0]
      return transposedRowLabels.slice(0, 8).map(({ label, rowIndex }) => {
        const row = upload.raw_data[rowIndex]
        const periodTotals: { period: number; total: number }[] = []

        group.periods.forEach(({ period, column }) => {
          const value = parseFloat(String(row[column]))
          periodTotals.push({ period, total: isNaN(value) ? 0 : value })
        })

        const latestTotal = periodTotals[periodTotals.length - 1]?.total || 0
        const previousTotal = periodTotals[periodTotals.length - 2]?.total || 0
        const change = previousTotal > 0 ? ((latestTotal - previousTotal) / previousTotal) * 100 : 0

        return {
          name: label,
          currentValue: latestTotal,
          previousValue: previousTotal,
          change,
          trend: change > 5 ? 'up' : change < -5 ? 'down' : 'flat',
          sparkline: periodTotals.map((item) => item.total),
        }
      })
    }

    // Normal data: each COLUMN GROUP is a channel/metric
    return sortedGroups.slice(0, 8).map((group) => {
      const periodTotals: { period: number; total: number }[] = []

      group.periods.forEach(({ period, column }) => {
        let total = 0
        upload.raw_data.forEach((row) => {
          const value = parseFloat(String(row[column]))
          if (!isNaN(value)) total += value
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
        sparkline: periodTotals.map((item) => item.total),
      }
    })
  }, [sortedGroups, upload.raw_data, isTransposed, transposedRowLabels])

  const trendChartData = useMemo(() => {
    if (visibleSeriesGroups.length === 0) return []

    // For transposed data: each row is a series, columns are periods
    if (isTransposed && transposedRowLabels.length > 0) {
      const group = visibleSeriesGroups[0]
      const visibleRows = transposedRowLabels.slice(0, CHART_MAX_VISIBLE_SERIES)

      return group.periods.map(({ period, column }, index) => {
        const point: Record<string, unknown> = {
          period: getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels),
        }

        visibleRows.forEach(({ label, rowIndex }) => {
          const row = upload.raw_data[rowIndex]
          const value = parseFloat(String(row[column]))
          point[label] = isNaN(value) ? 0 : value
        })

        return point
      })
    }

    // Normal data: each column group is a series
    return allSortedPeriods.map((period, index) => {
      const point: Record<string, unknown> = {
        period: getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels),
      }

      visibleSeriesGroups.forEach((group) => {
        const periodData = group.periods.find((entry) => entry.period === period)
        if (!periodData) return

        let total = 0
        upload.raw_data.forEach((row) => {
          const value = parseFloat(String(row[periodData.column]))
          if (!isNaN(value)) total += value
        })

        point[group.baseName] = total
      })

      return point
    })
  }, [visibleSeriesGroups, allSortedPeriods, aiPeriodType, aiPeriodLabels, upload.raw_data, isTransposed, transposedRowLabels])

  const activityChartData = useMemo(() => {
    if (!labelColumn || visibleSeriesGroups.length === 0) return []

    // For transposed data: show periods on X-axis, rows as series (same as trendChartData)
    if (isTransposed && transposedRowLabels.length > 0) {
      const group = visibleSeriesGroups[0]
      const rowsToShow = transposedRowLabels.slice(0, 3)

      return group.periods.slice(0, 12).map(({ period, column }, index) => {
        const point: Record<string, unknown> = {
          name: getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels).slice(0, 24),
        }

        rowsToShow.forEach(({ label, rowIndex }) => {
          const row = upload.raw_data[rowIndex]
          const value = parseFloat(String(row[column]))
          point[label] = isNaN(value) ? 0 : value
        })

        return point
      })
    }

    // Normal data: show rows on X-axis, column groups as series
    const channelsToShow = visibleSeriesGroups.slice(0, 3)

    return upload.raw_data.slice(0, 12).map((row) => {
      const point: Record<string, unknown> = {
        name: String(row[labelColumn] || 'Item').slice(0, 24),
      }

      channelsToShow.forEach((group) => {
        let total = 0
        group.periods.forEach(({ column }) => {
          const value = parseFloat(String(row[column]))
          if (!isNaN(value)) total += value
        })
        point[group.baseName] = total
      })

      return point
    })
  }, [labelColumn, visibleSeriesGroups, upload.raw_data, isTransposed, transposedRowLabels, aiPeriodType, aiPeriodLabels])

  const numericSummaryData = useMemo(() => {
    return upload.sheet_meta.numericColumnIndices.slice(0, 8).map((columnIndex) => {
      const header = upload.sheet_meta.headers[columnIndex]
      const total = upload.raw_data.reduce((acc, row) => {
        const value = parseFloat(String(row[header]))
        return isNaN(value) ? acc : acc + value
      }, 0)

      return { metric: header, total }
    })
  }, [upload.raw_data, upload.sheet_meta])

  const hasTimeSeriesData = visibleSeriesGroups.length > 0

  const executiveSummary = upload.ai_analysis?.executiveSummary
  const summarySnippet = executiveSummary
    ? executiveSummary.length > 260
      ? `${executiveSummary.slice(0, 260)}...`
      : executiveSummary
    : 'Trends, anomalies, and recommendations are organized below. Use Charts for deep comparison and Insights for action planning.'

  const highlightInsights = upload.insights_data?.insights?.slice(0, 3) || []

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="surface-panel grid w-full grid-cols-2 gap-1 p-1 md:grid-cols-4">
        <TabsTrigger value="overview" className="font-medium">Overview</TabsTrigger>
        <TabsTrigger value="charts" className="font-medium">Charts</TabsTrigger>
        <TabsTrigger value="data" className="font-medium">Data</TabsTrigger>
        <TabsTrigger value="insights" className="font-medium">Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6 space-y-6">
        <OverviewHeader
          rowCount={upload.row_count}
          channelCount={hasTimeSeriesData
            ? (isTransposed ? transposedRowLabels.length : sortedGroups.length)
            : upload.column_count}
          periodCount={hasTimeSeriesData ? visibleSeriesGroups[0]?.periods.length || 0 : null}
          uploadedAt={upload.uploaded_at}
          focusAreas={upload.ai_analysis?.displayRecommendations?.focusAreas || []}
        />

        {hasTimeSeriesData ? (
          <>
            <PrimaryTrendPanel
              title={isTransposed ? "Category Trends Over Time" : "Channel Trends Over Time"}
              caption={upload.ai_analysis?.displayRecommendations?.chartSuggestion || summarySnippet}
              data={trendChartData}
              xAxisKey="period"
              seriesKeys={isTransposed ? transposedSeriesNames : visibleSeriesGroups.map((group) => group.baseName)}
            />

            <ChannelGrid metrics={channelMetrics} title={isTransposed ? "Category Performance" : "Channel Health"} />
          </>
        ) : (
          <Card className="surface-panel p-6">
            <p className="kicker mb-1">Overview</p>
            <h3 className="text-xl font-semibold">Dataset Snapshot</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">No time-series pattern was detected. Review metric totals and inspect the Data tab for row-level analysis.</p>
            {numericSummaryData.length > 0 && (
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={numericSummaryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                    <XAxis dataKey="metric" tick={{ ...CHART_AXIS_STYLE, fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                    <YAxis tick={CHART_AXIS_STYLE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="total" fill={CHART_SERIES_COLOURS_ENTERPRISE[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}

        <Card className="surface-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-semibold">Executive Snapshot</h3>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{summarySnippet}</p>
        </Card>

        {highlightInsights.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xl font-semibold">Key Signals</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {highlightInsights.map((insight) => (
                <Card key={insight.id} className={`surface-card border ${getInsightTone(insight.severity)} p-4`}>
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{insight.description}</p>
                </Card>
              ))}
            </div>
          </section>
        )}
      </TabsContent>

      <TabsContent value="charts" className="mt-6 space-y-6">
        {hasTimeSeriesData ? (
          <>
            <PrimaryTrendPanel
              title="Primary Trend Analysis"
              caption={isTransposed
                ? "Compare category performance across time periods."
                : "Compare leading channel movements across the selected periods."}
              data={trendChartData}
              xAxisKey="period"
              seriesKeys={isTransposed ? transposedSeriesNames : visibleSeriesGroups.map((group) => group.baseName)}
            />

            <SecondaryCharts
              trendData={trendChartData}
              trendSeries={isTransposed ? transposedSeriesNames : visibleSeriesGroups.map((group) => group.baseName)}
              activityData={activityChartData}
              activitySeries={isTransposed
                ? transposedRowLabels.slice(0, 3).map(r => r.label)
                : visibleSeriesGroups.slice(0, 3).map((group) => group.baseName)}
            />

            <SummaryTable
              metrics={channelMetrics}
              periodLabels={periodLabels}
              periodType={aiPeriodType}
            />
          </>
        ) : (
          <Card className="surface-panel p-10 text-center">
            <BarChart3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold">Limited Chart Data</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This upload does not include multi-period columns (for example, `Channel_1`, `Channel_2`).
              Use the Data tab to review rows and column totals.
            </p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="data" className="mt-6">
        <DataTable
          data={upload.raw_data}
          headers={upload.sheet_meta.headers}
        />
      </TabsContent>

      <TabsContent value="insights" className="mt-6 space-y-4">
        <Card className="surface-card p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              AI recommendations and rule-based alerts are grouped below by operational impact.
            </p>
          </div>
        </Card>
        <AIInsightsPanel upload={upload} />
      </TabsContent>
    </Tabs>
  )
}

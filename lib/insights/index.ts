/**
 * Main insights engine
 *
 * Generates KPIs, trends, recommendations and chart configs from parsed data.
 * Fully deterministic — same input always produces same output.
 */

import { KPICard, TrendResult, InsightsResult, SheetMeta, HeadlineChartConfig } from '@/types'
import { calculateStats, detectTrend } from './trendDetector'
import { generateRecommendations } from './recommendations'

/**
 * Generates complete insights from parsed spreadsheet data
 *
 * @param rawData - Normalized row data
 * @param sheetMeta - Sheet metadata with column types
 * @returns Complete insights result
 */
export function generateInsights(
  rawData: Record<string, unknown>[],
  sheetMeta: SheetMeta
): InsightsResult {
  const numericColumns = sheetMeta.columns.filter((col) => col.detectedType === 'number')

  // Extract numeric values for each numeric column
  const numericData: Record<string, number[]> = {}
  for (const col of numericColumns) {
    const values = rawData
      .map((row) => row[col.header])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v))
    numericData[col.header] = values
  }

  // Generate KPI cards
  const kpis = generateKPICards(rawData, sheetMeta, numericColumns, numericData)

  // Generate trend analysis
  const trends = generateTrends(numericColumns, numericData)

  // Generate recommendations
  const insights = generateRecommendations(trends, rawData, sheetMeta)

  // Select headline chart
  const headlineChart = selectHeadlineChart(sheetMeta, trends)

  return {
    kpis,
    trends,
    insights,
    headlineChart,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Generates KPI cards for all numeric columns
 */
function generateKPICards(
  rawData: Record<string, unknown>[],
  sheetMeta: SheetMeta,
  numericColumns: typeof sheetMeta.columns,
  numericData: Record<string, number[]>
): KPICard[] {
  const kpis: KPICard[] = []

  // Determine if we have a date column for ordering
  const dateColumnIndex = sheetMeta.dateColumnIndex
  let orderedData = rawData

  if (dateColumnIndex !== null) {
    const dateColumn = sheetMeta.columns[dateColumnIndex]
    // Sort by date column (most recent last)
    orderedData = [...rawData].sort((a, b) => {
      const dateA = new Date(a[dateColumn.header] as string).getTime()
      const dateB = new Date(b[dateColumn.header] as string).getTime()
      return dateA - dateB
    })
  }

  for (const col of numericColumns) {
    const values = numericData[col.header]

    if (values.length < 2) {
      continue // Need at least 2 values for current/previous
    }

    // Get ordered values from sorted data
    const orderedValues = orderedData
      .map((row) => row[col.header])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v))

    const currentValue = orderedValues[orderedValues.length - 1]
    const previousValue = orderedValues[orderedValues.length - 2]

    // Calculate change
    const change = currentValue - previousValue
    const changePercent =
      previousValue === 0
        ? 0
        : (change / Math.abs(previousValue)) * 100

    // Determine direction
    let changeDirection: 'up' | 'down' | 'flat'
    if (Math.abs(changePercent) < 1) {
      changeDirection = 'flat'
    } else if (change > 0) {
      changeDirection = 'up'
    } else {
      changeDirection = 'down'
    }

    // Get last 10 values for sparkline
    const sparklineData = orderedValues.slice(-10)

    // Format values
    const isPercentage = col.isPercentage
    const formattedCurrent = formatNumber(currentValue, isPercentage)
    const formattedChange = formatChange(changePercent)

    kpis.push({
      columnName: col.header,
      columnIndex: col.index,
      currentValue,
      previousValue,
      changePercent,
      changeDirection,
      sparklineData,
      formattedCurrent,
      formattedChange,
      isPercentageColumn: isPercentage,
    })
  }

  return kpis
}

/**
 * Generates trend analysis for all numeric columns
 */
function generateTrends(
  numericColumns: any[],
  numericData: Record<string, number[]>
): TrendResult[] {
  const trends: TrendResult[] = []

  for (const col of numericColumns) {
    const values = numericData[col.header]
    const stats = calculateStats(values)
    const trendResult = detectTrend(values)

    trends.push({
      columnName: col.header,
      columnIndex: col.index,
      trend: trendResult.trend,
      firstHalfMean: trendResult.firstHalfMean,
      secondHalfMean: trendResult.secondHalfMean,
      changePercent: trendResult.changePercent,
      stats,
    })
  }

  return trends
}

/**
 * Selects the best chart configuration for the overview
 */
function selectHeadlineChart(
  sheetMeta: SheetMeta,
  trends: TrendResult[]
): HeadlineChartConfig {
  const hasDateColumn = sheetMeta.dateColumnIndex !== null
  const numericCount = sheetMeta.numericColumnIndices.length
  const hasCategoryColumn = sheetMeta.categoryColumnIndices.length > 0

  // Case 1: Date column + multiple numeric columns → Line chart
  if (hasDateColumn && numericCount >= 2) {
    const dateColumn = sheetMeta.columns[sheetMeta.dateColumnIndex!]

    // Select top 3 movers by absolute change percent
    const topMovers = [...trends]
      .filter((t) => t.trend !== 'insufficient_data')
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3)
      .map((t) => t.columnName)

    // If fewer than 3 movers, just use first 3 numeric columns
    const seriesColumns =
      topMovers.length >= 3
        ? topMovers
        : sheetMeta.numericColumnIndices
            .slice(0, 3)
            .map((idx) => sheetMeta.columns[idx].header)

    return {
      chartType: 'line',
      xAxisColumn: dateColumn.header,
      seriesColumns,
      title: 'Trends Over Time',
    }
  }

  // Case 2: Date column + single numeric → Area chart
  if (hasDateColumn && numericCount === 1) {
    const dateColumn = sheetMeta.columns[sheetMeta.dateColumnIndex!]
    const numericColumn = sheetMeta.columns[sheetMeta.numericColumnIndices[0]]

    return {
      chartType: 'area',
      xAxisColumn: dateColumn.header,
      seriesColumns: [numericColumn.header],
      title: `${numericColumn.header} Over Time`,
    }
  }

  // Case 3: No date + category column → Bar chart grouped by category
  if (!hasDateColumn && hasCategoryColumn) {
    const categoryColumn = sheetMeta.columns[sheetMeta.categoryColumnIndices[0]]
    const seriesColumns = sheetMeta.numericColumnIndices
      .slice(0, 5)
      .map((idx) => sheetMeta.columns[idx].header)

    return {
      chartType: 'bar',
      xAxisColumn: categoryColumn.header,
      seriesColumns,
      title: `Comparison by ${categoryColumn.header}`,
    }
  }

  // Case 4: Only numeric columns → Bar chart of latest values
  const seriesColumns = sheetMeta.numericColumnIndices
    .slice(0, 5)
    .map((idx) => sheetMeta.columns[idx].header)

  return {
    chartType: 'bar',
    xAxisColumn: seriesColumns[0] || 'Value',
    seriesColumns: seriesColumns.slice(1),
    title: 'Metric Comparison',
  }
}

/**
 * Formats a number for display
 */
function formatNumber(value: number, isPercentage: boolean): string {
  if (isPercentage) {
    return `${(value * 100).toFixed(1)}%`
  }

  // Determine if it's an integer or decimal
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }

  return value.toFixed(2)
}

/**
 * Formats a percentage change for display
 */
function formatChange(changePercent: number): string {
  const sign = changePercent > 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(1)}%`
}

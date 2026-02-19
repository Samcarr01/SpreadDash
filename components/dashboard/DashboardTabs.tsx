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

// Month name mappings for detection
const MONTH_NAMES_FULL = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_NAMES_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * Extract month number (1-12) from a string if it contains a month name
 */
function extractMonth(str: string): number | null {
  const lower = str.toLowerCase()

  // Check full month names
  for (let i = 0; i < MONTH_NAMES_FULL.length; i++) {
    if (lower.includes(MONTH_NAMES_FULL[i])) return i + 1
  }

  // Check short month names (with word boundary to avoid false matches like "market")
  for (let i = 0; i < MONTH_NAMES_SHORT.length; i++) {
    const regex = new RegExp(`\\b${MONTH_NAMES_SHORT[i]}\\b`, 'i')
    if (regex.test(lower)) return i + 1
  }

  return null
}

/**
 * Extract quarter number (1-4) from a string
 */
function extractQuarter(str: string): number | null {
  const match = str.match(/\bq([1-4])\b/i)
  if (match) return parseInt(match[1], 10)
  return null
}

/**
 * Extract year from a string (2000-2099 range)
 */
function extractYear(str: string): number | null {
  // Match 4-digit years
  const match4 = str.match(/\b(20\d{2})\b/)
  if (match4) return parseInt(match4[1], 10)

  // Match 2-digit years (20-99 assumed 2020-2099, 00-19 assumed 2000-2019)
  const match2 = str.match(/\b['']?(\d{2})\b/)
  if (match2) {
    const yr = parseInt(match2[1], 10)
    return yr >= 0 && yr <= 99 ? (yr < 50 ? 2000 + yr : 1900 + yr) : null
  }

  return null
}

/**
 * Calculate a sortable period number from time components
 */
function calculatePeriodNumber(month: number | null, quarter: number | null, year: number | null, index: number): number {
  // If we have year + month, use year*12 + month for proper sorting
  if (year && month) {
    return year * 12 + month
  }

  // If we have year + quarter, use year*4 + quarter
  if (year && quarter) {
    return year * 4 + quarter
  }

  // If we have just year
  if (year) {
    return year
  }

  // If we have just month (assume same year, use month order)
  if (month) {
    return month
  }

  // If we have just quarter
  if (quarter) {
    return quarter
  }

  // Fallback to index
  return index + 1
}

/**
 * Comprehensive time-series column detection
 * Handles various patterns: months, quarters, years, prefixed/suffixed patterns, and numeric suffixes
 */
function detectTimeSeriesColumns(headers: string[]) {
  const groups: Map<string, { baseName: string; periods: { period: number; column: string; label?: string }[] }> = new Map()

  // Track which headers have been assigned to groups
  const assigned = new Set<string>()

  // === PATTERN 1: Underscore + Number (Website_1, Website_2) ===
  const numberPattern = /^(.+?)_(\d+)$/
  headers.forEach((header) => {
    const match = header.match(numberPattern)
    if (!match) return

    const baseName = match[1].replace(/_/g, ' ').trim()
    const period = parseInt(match[2], 10)

    if (!groups.has(baseName)) {
      groups.set(baseName, { baseName, periods: [] })
    }
    groups.get(baseName)!.periods.push({ period, column: header })
    assigned.add(header)
  })

  // === PATTERN 2: Underscore + Letter (Column_A, Column_B) ===
  const letterPattern = /^(.+?)_([A-Z])(\d*)$/
  headers.forEach((header) => {
    if (assigned.has(header)) return
    const match = header.match(letterPattern)
    if (!match) return

    const baseName = match[1].replace(/_/g, ' ').trim()
    const letter = match[2]
    const suffix = match[3] ? parseInt(match[3], 10) : 0
    const period = suffix * 26 + (letter.charCodeAt(0) - 64)

    if (!groups.has(baseName)) {
      groups.set(baseName, { baseName, periods: [] })
    }
    groups.get(baseName)!.periods.push({ period, column: header })
    assigned.add(header)
  })

  // === PATTERN 3: Direct month/quarter/year columns ===
  // Detect columns that ARE time periods (e.g., "January", "Q1", "2024", "Jan 2024")
  const timeColumns: { header: string; month: number | null; quarter: number | null; year: number | null; index: number }[] = []

  headers.forEach((header, index) => {
    if (assigned.has(header)) return

    const month = extractMonth(header)
    const quarter = extractQuarter(header)
    const year = extractYear(header)

    // Only include if we found at least one time component
    if (month || quarter || year) {
      timeColumns.push({ header, month, quarter, year, index })
    }
  })

  // If we found multiple time columns, group them
  if (timeColumns.length >= 2) {
    // Determine the type of time series
    const hasMonths = timeColumns.some(t => t.month !== null)
    const hasQuarters = timeColumns.some(t => t.quarter !== null)
    const hasYears = timeColumns.some(t => t.year !== null)

    let groupName = 'Value'
    if (hasMonths) groupName = 'Monthly'
    else if (hasQuarters) groupName = 'Quarterly'
    else if (hasYears) groupName = 'Yearly'

    if (!groups.has(groupName)) {
      groups.set(groupName, { baseName: groupName, periods: [] })
    }

    timeColumns.forEach(({ header, month, quarter, year, index }) => {
      const period = calculatePeriodNumber(month, quarter, year, index)
      groups.get(groupName)!.periods.push({ period, column: header, label: header })
      assigned.add(header)
    })
  }

  // === PATTERN 4: Prefix/Suffix patterns (Sales Jan, Sales Feb OR Jan Sales, Feb Sales) ===
  // Group unassigned headers by their non-time components
  const unassignedHeaders = headers.filter(h => !assigned.has(h))

  if (unassignedHeaders.length >= 2) {
    // Try to find common prefix or suffix patterns
    const prefixGroups: Map<string, { header: string; timePart: string; month: number | null; quarter: number | null; year: number | null }[]> = new Map()
    const suffixGroups: Map<string, { header: string; timePart: string; month: number | null; quarter: number | null; year: number | null }[]> = new Map()

    unassignedHeaders.forEach((header) => {
      const month = extractMonth(header)
      const quarter = extractQuarter(header)
      const year = extractYear(header)

      if (!month && !quarter && !year) return

      // Extract the non-time part
      let remaining = header

      // Remove month names
      MONTH_NAMES_FULL.forEach(m => {
        remaining = remaining.replace(new RegExp(m, 'gi'), '').trim()
      })
      MONTH_NAMES_SHORT.forEach(m => {
        remaining = remaining.replace(new RegExp(`\\b${m}\\b`, 'gi'), '').trim()
      })

      // Remove quarter patterns
      remaining = remaining.replace(/\bq[1-4]\b/gi, '').trim()

      // Remove year patterns
      remaining = remaining.replace(/\b20\d{2}\b/g, '').trim()
      remaining = remaining.replace(/\b['']?\d{2}\b/g, '').trim()

      // Clean up separators
      remaining = remaining.replace(/^[\s\-_:]+|[\s\-_:]+$/g, '').trim()

      if (remaining) {
        // Check if time comes before or after the base name
        const headerLower = header.toLowerCase()
        const remainingLower = remaining.toLowerCase()

        if (headerLower.indexOf(remainingLower) === 0) {
          // Base name is prefix (e.g., "Sales January" -> prefix "Sales")
          if (!prefixGroups.has(remaining)) prefixGroups.set(remaining, [])
          prefixGroups.get(remaining)!.push({ header, timePart: header.slice(remaining.length).trim(), month, quarter, year })
        } else {
          // Base name is suffix (e.g., "January Sales" -> suffix "Sales")
          if (!suffixGroups.has(remaining)) suffixGroups.set(remaining, [])
          suffixGroups.get(remaining)!.push({ header, timePart: header.slice(0, header.toLowerCase().lastIndexOf(remainingLower)).trim(), month, quarter, year })
        }
      }
    })

    // Add valid prefix groups (2+ columns with same prefix)
    prefixGroups.forEach((items, baseName) => {
      if (items.length >= 2) {
        if (!groups.has(baseName)) {
          groups.set(baseName, { baseName, periods: [] })
        }
        items.forEach(({ header, month, quarter, year }, index) => {
          const period = calculatePeriodNumber(month, quarter, year, index)
          groups.get(baseName)!.periods.push({ period, column: header, label: header })
          assigned.add(header)
        })
      }
    })

    // Add valid suffix groups (2+ columns with same suffix)
    suffixGroups.forEach((items, baseName) => {
      if (items.length >= 2) {
        if (!groups.has(baseName)) {
          groups.set(baseName, { baseName, periods: [] })
        }
        items.forEach(({ header, month, quarter, year }, index) => {
          const period = calculatePeriodNumber(month, quarter, year, index)
          groups.get(baseName)!.periods.push({ period, column: header, label: header })
          assigned.add(header)
        })
      }
    })
  }

  // Filter to groups with at least 2 periods and sort periods
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

function getPeriodLabel(
  period: number,
  index: number,
  periodType: string,
  aiPeriodLabels: string[],
  columnLabel?: string
) {
  // If we have a stored column label (from direct time column detection), use it
  if (columnLabel) {
    return columnLabel
  }

  // If AI provided labels, use them
  if (aiPeriodLabels[index]) {
    return aiPeriodLabels[index]
  }

  // For large period numbers that look like year*12+month, decode them
  if (period > 2000 * 12) {
    const year = Math.floor(period / 12)
    const month = period % 12 || 12
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[month - 1]} ${year}`
  }

  // For period numbers that look like year*4+quarter, decode them
  if (period > 2000 * 4 && period < 2000 * 12) {
    const year = Math.floor(period / 4)
    const quarter = period % 4 || 4
    return `Q${quarter} ${year}`
  }

  // For period numbers that look like years directly (2000-2100)
  if (period >= 2000 && period <= 2100) {
    return String(period)
  }

  if (periodType === 'month') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    if (period >= 1 && period <= 12) {
      return monthNames[period - 1]
    }
    const yearOffset = Math.floor((period - 1) / 12)
    const monthIndex = (period - 1) % 12
    if (yearOffset > 0) {
      return `${monthNames[monthIndex]} Y${yearOffset + 1}`
    }
    return monthNames[monthIndex] || `Month ${period}`
  }

  if (periodType === 'quarter') {
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

  // Default fallback: assume monthly if period is 1-12
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

  // Collect all periods with their labels
  const allSortedPeriodsWithLabels = useMemo(() => {
    const periodsMap = new Map<number, string | undefined>()
    visibleSeriesGroups.forEach((group) => {
      group.periods.forEach((p) => {
        // Keep the label if we have one (from direct time column detection)
        if (!periodsMap.has(p.period) || p.label) {
          periodsMap.set(p.period, p.label)
        }
      })
    })
    return Array.from(periodsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([period, label]) => ({ period, label }))
  }, [visibleSeriesGroups])

  const allSortedPeriods = useMemo(
    () => allSortedPeriodsWithLabels.map(p => p.period),
    [allSortedPeriodsWithLabels]
  )

  const periodLabels = useMemo(
    () => allSortedPeriodsWithLabels.map(({ period, label }, index) =>
      getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels, label)
    ),
    [allSortedPeriodsWithLabels, aiPeriodType, aiPeriodLabels]
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

      return group.periods.map(({ period, column, label: colLabel }, index) => {
        const point: Record<string, unknown> = {
          period: getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels, colLabel),
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
    return allSortedPeriodsWithLabels.map(({ period, label: colLabel }, index) => {
      const point: Record<string, unknown> = {
        period: getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels, colLabel),
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
  }, [visibleSeriesGroups, allSortedPeriodsWithLabels, aiPeriodType, aiPeriodLabels, upload.raw_data, isTransposed, transposedRowLabels])

  const activityChartData = useMemo(() => {
    if (!labelColumn || visibleSeriesGroups.length === 0) return []

    // For transposed data: show periods on X-axis, rows as series (same as trendChartData)
    if (isTransposed && transposedRowLabels.length > 0) {
      const group = visibleSeriesGroups[0]
      const rowsToShow = transposedRowLabels.slice(0, 3)

      return group.periods.slice(0, 12).map(({ period, column, label: colLabel }, index) => {
        const point: Record<string, unknown> = {
          name: getPeriodLabel(period, index, aiPeriodType, aiPeriodLabels, colLabel).slice(0, 24),
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

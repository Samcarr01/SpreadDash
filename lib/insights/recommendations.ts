/**
 * Auto-recommendation engine for generating business insights
 */

import { Insight, SheetMeta, TrendResult, THRESHOLDS } from '@/types'
import { calculateStats, calculatePearsonCorrelation } from './trendDetector'

/**
 * Generates actionable insights from trend analysis
 *
 * Rules:
 * 1. Biggest mover up — highest positive % change
 * 2. Biggest mover down — largest negative % change
 * 3. Highest volatility — highest coefficient of variation
 * 4. Flatline alert — flat trend with low stdDev
 * 5. Outlier detection — values >3 stdDev from mean
 * 6. Correlation hint — Pearson r > 0.7
 *
 * @param trends - Trend analysis results
 * @param rawData - Original parsed data
 * @param sheetMeta - Sheet metadata
 * @returns Array of insights (max 6, sorted by significance)
 */
export function generateRecommendations(
  trends: TrendResult[],
  rawData: Record<string, unknown>[],
  sheetMeta: SheetMeta
): Insight[] {
  const insights: Insight[] = []
  let idCounter = 0

  // Filter out trends with insufficient data
  const validTrends = trends.filter(
    (t) => t.trend !== 'insufficient_data'
  )

  if (validTrends.length === 0) {
    return insights
  }

  // 1. Biggest mover up
  const risingTrends = validTrends.filter((t) => t.trend === 'rising')
  if (risingTrends.length > 0) {
    const biggest = risingTrends.reduce((max, t) =>
      t.changePercent > max.changePercent ? t : max
    )

    insights.push({
      id: `insight-${idCounter++}`,
      type: 'biggest_mover_up',
      severity: 'positive',
      title: `${biggest.columnName} showing strong growth`,
      description: `${biggest.columnName} increased by ${biggest.changePercent.toFixed(1)}% in the second half of the period (${biggest.firstHalfMean.toFixed(2)} → ${biggest.secondHalfMean.toFixed(2)})`,
      relatedColumns: [biggest.columnName],
      value: biggest.changePercent,
    })
  }

  // 2. Biggest mover down
  const fallingTrends = validTrends.filter((t) => t.trend === 'falling')
  if (fallingTrends.length > 0) {
    const biggest = fallingTrends.reduce((max, t) =>
      Math.abs(t.changePercent) > Math.abs(max.changePercent) ? t : max
    )

    insights.push({
      id: `insight-${idCounter++}`,
      type: 'biggest_mover_down',
      severity: 'negative',
      title: `${biggest.columnName} declining`,
      description: `${biggest.columnName} dropped by ${Math.abs(biggest.changePercent).toFixed(1)}% in the second half of the period (${biggest.firstHalfMean.toFixed(2)} → ${biggest.secondHalfMean.toFixed(2)})`,
      relatedColumns: [biggest.columnName],
      value: biggest.changePercent,
    })
  }

  // 3. Highest volatility (coefficient of variation)
  const coefficients = validTrends
    .filter((t) => t.stats.mean !== 0)
    .map((t) => ({
      trend: t,
      cv: t.stats.stdDev / Math.abs(t.stats.mean),
    }))
    .filter((c) => c.cv > 0.2) // Only flag if CV > 20%

  if (coefficients.length > 0) {
    const highest = coefficients.reduce((max, c) =>
      c.cv > max.cv ? c : max
    )

    insights.push({
      id: `insight-${idCounter++}`,
      type: 'high_volatility',
      severity: 'warning',
      title: `${highest.trend.columnName} shows high variability`,
      description: `${highest.trend.columnName} has high variability (CV: ${highest.cv.toFixed(2)}). Range: ${highest.trend.stats.min.toFixed(2)} to ${highest.trend.stats.max.toFixed(2)}`,
      relatedColumns: [highest.trend.columnName],
      value: highest.cv,
    })
  }

  // 4. Flatline alert (low stdDev relative to mean)
  const flatTrends = validTrends.filter((t) => t.trend === 'flat')
  for (const trend of flatTrends) {
    const cv = trend.stats.mean !== 0 ? trend.stats.stdDev / Math.abs(trend.stats.mean) : 0
    if (cv < 0.05) {
      // Very stable (CV < 5%)
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'flatline',
        severity: 'info',
        title: `${trend.columnName} remains stable`,
        description: `${trend.columnName} has remained stable at ~${trend.stats.mean.toFixed(2)} with minimal variation (±${trend.stats.stdDev.toFixed(2)})`,
        relatedColumns: [trend.columnName],
        value: cv,
      })
      break // Only report one flatline
    }
  }

  // 5. Outlier detection (values >3 stdDev from mean)
  for (const trend of validTrends) {
    const column = sheetMeta.columns[trend.columnIndex]
    const values = rawData
      .map((row) => row[column.header])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v))

    const { mean, stdDev } = trend.stats
    const threshold = THRESHOLDS.OUTLIER_STDDEV_MULTIPLIER * stdDev

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      const deviation = Math.abs(value - mean)

      if (deviation > threshold && stdDev > 0) {
        insights.push({
          id: `insight-${idCounter++}`,
          type: 'outlier',
          severity: 'warning',
          title: `Outlier detected in ${trend.columnName}`,
          description: `Row ${i + 1}: ${trend.columnName} = ${value.toFixed(2)}, which is ${(deviation / stdDev).toFixed(1)} standard deviations from the mean (${mean.toFixed(2)})`,
          relatedColumns: [trend.columnName],
          value: deviation,
        })
        break // Only report first outlier per column
      }
    }

    if (insights.filter((i) => i.type === 'outlier').length >= 2) {
      break // Max 2 outlier insights
    }
  }

  // 6. Correlation hints (Pearson r > 0.7)
  const numericColumns = sheetMeta.columns.filter((c) => c.detectedType === 'number')

  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const col1 = numericColumns[i]
      const col2 = numericColumns[j]

      const values1 = rawData
        .map((row) => row[col1.header])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))

      const values2 = rawData
        .map((row) => row[col2.header])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))

      // Need same-length arrays for correlation
      const minLength = Math.min(values1.length, values2.length)
      const x = values1.slice(0, minLength)
      const y = values2.slice(0, minLength)

      if (x.length >= THRESHOLDS.MIN_DATA_POINTS_FOR_TRENDS) {
        const correlation = calculatePearsonCorrelation(x, y)

        if (Math.abs(correlation) >= THRESHOLDS.CORRELATION_THRESHOLD) {
          const direction = correlation > 0 ? 'positively' : 'negatively'
          insights.push({
            id: `insight-${idCounter++}`,
            type: 'correlation',
            severity: 'info',
            title: `${col1.header} and ${col2.header} appear correlated`,
            description: `${col1.header} and ${col2.header} are ${direction} correlated (r=${correlation.toFixed(2)}), suggesting they may move together`,
            relatedColumns: [col1.header, col2.header],
            value: Math.abs(correlation),
          })
          break // Only report first correlation
        }
      }
    }

    if (insights.filter((i) => i.type === 'correlation').length >= 1) {
      break // Max 1 correlation insight
    }
  }

  // Sort by absolute value (significance) and limit to 6
  return insights
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6)
}

/**
 * Trend detection and statistical analysis utilities
 */

import { THRESHOLDS } from '@/types'

/**
 * Statistical measures for a dataset
 */
export interface Stats {
  min: number
  max: number
  mean: number
  median: number
  stdDev: number
}

/**
 * Calculates comprehensive statistics for a numeric dataset
 *
 * @param values - Array of numbers (null values should be filtered out before calling)
 * @returns Statistical measures
 */
export function calculateStats(values: number[]): Stats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 }
  }

  // Min and max
  const min = Math.min(...values)
  const max = Math.max(...values)

  // Mean
  const sum = values.reduce((acc, val) => acc + val, 0)
  const mean = sum / values.length

  // Median
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

  // Standard deviation
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
  const stdDev = Math.sqrt(variance)

  return { min, max, mean, median, stdDev }
}

/**
 * Detects the trend direction of a numeric series
 *
 * Splits data in half and compares means to classify as:
 * - rising: second half mean >5% higher
 * - falling: second half mean >5% lower
 * - flat: change within ±5%
 * - volatile: stdDev of second half >2x first half
 * - insufficient_data: <4 data points
 *
 * @param values - Array of numbers (null values filtered out)
 * @returns Trend classification
 */
export function detectTrend(values: number[]): {
  trend: 'rising' | 'falling' | 'flat' | 'volatile' | 'insufficient_data'
  firstHalfMean: number
  secondHalfMean: number
  changePercent: number
} {
  // Check for insufficient data
  if (values.length < THRESHOLDS.MIN_DATA_POINTS_FOR_TRENDS) {
    return {
      trend: 'insufficient_data',
      firstHalfMean: 0,
      secondHalfMean: 0,
      changePercent: 0,
    }
  }

  // Split data in half
  const midpoint = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, midpoint)
  const secondHalf = values.slice(midpoint)

  // Calculate means for each half
  const firstHalfMean = firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length
  const secondHalfMean = secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length

  // Calculate percentage change
  const changePercent =
    firstHalfMean === 0
      ? 0
      : ((secondHalfMean - firstHalfMean) / Math.abs(firstHalfMean)) * 100

  // Check for volatility (stdDev of second half >2x first half)
  const firstHalfStats = calculateStats(firstHalf)
  const secondHalfStats = calculateStats(secondHalf)

  if (
    secondHalfStats.stdDev > THRESHOLDS.VOLATILITY_MULTIPLIER * firstHalfStats.stdDev &&
    firstHalfStats.stdDev > 0
  ) {
    return {
      trend: 'volatile',
      firstHalfMean,
      secondHalfMean,
      changePercent,
    }
  }

  // Classify based on percentage change threshold
  const threshold = THRESHOLDS.TREND_CHANGE_PERCENT * 100 // Convert to percentage

  if (changePercent > threshold) {
    return {
      trend: 'rising',
      firstHalfMean,
      secondHalfMean,
      changePercent,
    }
  } else if (changePercent < -threshold) {
    return {
      trend: 'falling',
      firstHalfMean,
      secondHalfMean,
      changePercent,
    }
  } else {
    return {
      trend: 'flat',
      firstHalfMean,
      secondHalfMean,
      changePercent,
    }
  }
}

/**
 * Calculates the Pearson correlation coefficient between two numeric series
 *
 * @param xValues - First numeric series
 * @param yValues - Second numeric series (must be same length as xValues)
 * @returns Pearson r value (-1 to 1), or 0 if calculation fails
 */
export function calculatePearsonCorrelation(
  xValues: number[],
  yValues: number[]
): number {
  if (xValues.length !== yValues.length || xValues.length === 0) {
    return 0
  }

  const n = xValues.length

  // Calculate means
  const xMean = xValues.reduce((acc, val) => acc + val, 0) / n
  const yMean = yValues.reduce((acc, val) => acc + val, 0) / n

  // Calculate covariance and standard deviations
  let covariance = 0
  let xVariance = 0
  let yVariance = 0

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean
    const yDiff = yValues[i] - yMean
    covariance += xDiff * yDiff
    xVariance += xDiff * xDiff
    yVariance += yDiff * yDiff
  }

  // Handle division by zero
  const denominator = Math.sqrt(xVariance * yVariance)
  if (denominator === 0) {
    return 0
  }

  const correlation = covariance / denominator

  // Clamp to [-1, 1] due to floating point precision
  return Math.max(-1, Math.min(1, correlation))
}

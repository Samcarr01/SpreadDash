/**
 * Column type detection utilities
 */

import { ColumnMeta, ColumnType, THRESHOLDS } from '@/types'
import { normaliseDates, normaliseNumbers } from './sheetNormaliser'

/**
 * Detects the type of a column based on its values
 *
 * Classification rules (in order):
 * 1. date: >70% parse as valid dates
 * 2. number: >80% parse as numbers
 * 3. category: text with ≤20 unique values
 * 4. text: everything else
 *
 * @param values - All values in the column
 * @param header - Column header name
 * @param index - Column index
 * @returns ColumnMeta object with detected type and metadata
 */
export function detectColumnType(
  values: unknown[],
  header: string,
  index: number
): ColumnMeta {
  // Filter out null/empty values for analysis
  const nonEmptyValues = values.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ''
  )

  const totalCount = values.length
  const nullCount = totalCount - nonEmptyValues.length

  // Count unique values
  const uniqueValues = new Set(nonEmptyValues.map((v) => String(v)))
  const uniqueCount = uniqueValues.size

  // Take first 100 non-empty values as sample for type detection
  const sampleSize = Math.min(THRESHOLDS.TYPE_SAMPLE_SIZE, nonEmptyValues.length)
  const sample = nonEmptyValues.slice(0, sampleSize)

  // Get first 5 non-empty values as sample values for display
  const sampleValues = nonEmptyValues
    .slice(0, 5)
    .map((v) => String(v))

  // If all empty, default to text
  if (nonEmptyValues.length === 0) {
    return {
      index,
      header,
      detectedType: 'text' as ColumnType,
      sampleValues: [],
      nullCount,
      uniqueCount: 0,
      isPercentage: false,
    }
  }

  // Try date detection first
  const normalisedDates = normaliseDates(sample)
  const validDateCount = normalisedDates.filter((d) => d !== null).length
  const dateParseRate = validDateCount / sampleSize

  if (dateParseRate >= THRESHOLDS.DATE_DETECTION_THRESHOLD) {
    return {
      index,
      header,
      detectedType: 'date' as ColumnType,
      sampleValues,
      nullCount,
      uniqueCount,
      isPercentage: false,
    }
  }

  // Try number detection
  const normalisedNumbers = normaliseNumbers(sample)
  const validNumberCount = normalisedNumbers.filter((n) => n !== null).length
  const numberParseRate = validNumberCount / sampleSize

  // Check if column contains percentage values
  const hasPercentages = sample.some((v) => String(v).includes('%'))

  if (numberParseRate >= THRESHOLDS.NUMBER_DETECTION_THRESHOLD) {
    return {
      index,
      header,
      detectedType: 'number' as ColumnType,
      sampleValues,
      nullCount,
      uniqueCount,
      isPercentage: hasPercentages,
    }
  }

  // Check if it's a category (text with ≤20 unique values)
  if (uniqueCount <= THRESHOLDS.CATEGORY_MAX_UNIQUE) {
    return {
      index,
      header,
      detectedType: 'category' as ColumnType,
      sampleValues,
      nullCount,
      uniqueCount,
      isPercentage: false,
    }
  }

  // Default to text
  return {
    index,
    header,
    detectedType: 'text' as ColumnType,
    sampleValues,
    nullCount,
    uniqueCount,
    isPercentage: false,
  }
}

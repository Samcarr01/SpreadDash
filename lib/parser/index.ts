/**
 * Main spreadsheet parser using SheetJS
 *
 * Handles Excel (.xlsx, .xls) and CSV files.
 * Detects headers, classifies column types, and normalizes data.
 */

import * as XLSX from 'xlsx'
import { ParseResult, SheetMeta, LIMITS, THRESHOLDS } from '@/types'
import { detectHeaders, normaliseDates, normaliseNumbers } from './sheetNormaliser'
import { detectColumnType } from './columnDetector'

/**
 * Parses a spreadsheet file buffer into structured, typed data
 *
 * @param buffer - File buffer from upload
 * @param filename - Original filename (for error messages)
 * @returns ParseResult with raw_data and sheet_meta, or error
 */
export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  const warnings: string[] = []

  try {
    // Read workbook from buffer
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return {
        success: false,
        data: null,
        error: 'File contains no sheets',
        warnings,
      }
    }

    const worksheet = workbook.Sheets[sheetName]

    // Convert to array of arrays (raw rows)
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
    })

    // Handle empty file
    if (rawRows.length === 0) {
      return {
        success: false,
        data: null,
        error: 'File contains no data',
        warnings,
      }
    }

    // Check row limit
    if (rawRows.length > LIMITS.MAX_ROWS) {
      return {
        success: false,
        data: null,
        error: `File exceeds maximum row limit of ${LIMITS.MAX_ROWS.toLocaleString()}`,
        warnings,
      }
    }

    // Detect headers and separate data rows
    const { headers, dataRows } = detectHeaders(rawRows)

    // Handle headers-only file
    if (dataRows.length === 0) {
      return {
        success: false,
        data: null,
        error: 'No data rows found',
        warnings,
      }
    }

    // Check column limit
    if (headers.length > LIMITS.MAX_COLUMNS) {
      return {
        success: false,
        data: null,
        error: `File exceeds maximum column limit of ${LIMITS.MAX_COLUMNS}`,
        warnings,
      }
    }

    // Convert data rows to objects keyed by headers
    const rawData: Record<string, unknown>[] = dataRows.map((row) => {
      const obj: Record<string, unknown> = {}
      headers.forEach((header, idx) => {
        const value = row[idx]
        // Strip whitespace from string values
        obj[header] =
          typeof value === 'string' ? value.trim() : value
      })
      return obj
    })

    // Extract column values for type detection
    const columnValues: unknown[][] = headers.map((header) =>
      rawData.map((row) => row[header])
    )

    // Detect column types
    const columns = headers.map((header, index) =>
      detectColumnType(columnValues[index], header, index)
    )

    // Find indices of special column types
    const dateColumnIndex = columns.findIndex((col) => col.detectedType === 'date')
    const numericColumnIndices = columns
      .filter((col) => col.detectedType === 'number')
      .map((col) => col.index)
    const categoryColumnIndices = columns
      .filter((col) => col.detectedType === 'category')
      .map((col) => col.index)

    // Normalize data based on detected types
    const normalisedData = rawData.map((row) => {
      const normalisedRow: Record<string, unknown> = {}

      headers.forEach((header, idx) => {
        const column = columns[idx]
        const value = row[header]

        if (column.detectedType === 'date') {
          // Normalize date
          const normalised = normaliseDates([value])[0]
          normalisedRow[header] = normalised
        } else if (column.detectedType === 'number') {
          // Normalize number
          let normalised = normaliseNumbers([value])[0]

          // If percentage column, convert percentage to decimal
          if (column.isPercentage && normalised !== null) {
            const strValue = String(value)
            if (strValue.includes('%')) {
              normalised = normalised / 100
            }
          }

          normalisedRow[header] = normalised
        } else {
          // Text or category - keep as-is (already trimmed)
          normalisedRow[header] = value
        }
      })

      return normalisedRow
    })

    // Check for date parsing warnings
    columns.forEach((column) => {
      if (column.detectedType === 'date') {
        const dateValues = normalisedData.map((row) => row[column.header])
        const nullDateCount = dateValues.filter((v) => v === null).length
        const failureRate = nullDateCount / dateValues.length

        if (failureRate > 0.1) {
          warnings.push(
            `Column "${column.header}": ${Math.round(failureRate * 100)}% of date values failed to parse`
          )
        }
      }
    })

    // Build sheet metadata
    const sheetMeta: SheetMeta = {
      headers,
      columns,
      dateColumnIndex: dateColumnIndex === -1 ? null : dateColumnIndex,
      numericColumnIndices,
      categoryColumnIndices,
      totalRows: normalisedData.length,
      totalColumns: headers.length,
    }

    return {
      success: true,
      data: {
        raw_data: normalisedData,
        sheet_meta: sheetMeta,
      },
      warnings,
    }
  } catch (error) {
    console.error('[Parser Error]', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to parse spreadsheet',
      warnings,
    }
  }
}

/**
 * Sheet normalisation utilities for header detection and data cleaning
 */

/**
 * Detects the header row in messy spreadsheets
 *
 * Scans rows 0-10 for the first row where >50% of cells are non-empty strings.
 * Deduplicates headers and sanitizes them.
 *
 * @param rawRows - Raw rows from SheetJS
 * @returns Header row index, cleaned headers, and remaining data rows
 */
export function detectHeaders(rawRows: unknown[][]): {
  headerIndex: number
  headers: string[]
  dataRows: unknown[][]
} {
  const maxHeaderSearchRows = Math.min(10, rawRows.length)

  // Find first row where >50% of cells are non-empty strings (not Date objects)
  let headerIndex = -1
  let potentialHeaders: unknown[] = []

  for (let i = 0; i < maxHeaderSearchRows; i++) {
    const row = rawRows[i] || []
    const nonEmptyCells = row.filter(
      (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''
    )

    // Count how many are plain strings (not dates/numbers)
    const stringCells = row.filter(
      (cell) =>
        typeof cell === 'string' &&
        cell.trim() !== '' &&
        !isDateObject(cell)
    )

    // Header row should have mostly strings, not Date objects
    if (nonEmptyCells.length > row.length * 0.5 && stringCells.length > row.length * 0.3) {
      headerIndex = i
      potentialHeaders = row
      break
    }
  }

  // If no header found, generate Column_A, Column_B etc.
  let headers: string[]
  let dataStartIndex: number

  if (headerIndex === -1) {
    // No clear header - use first row to determine column count
    const firstRow = rawRows[0] || []
    headers = firstRow.map((_, idx) => `Column_${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? Math.floor(idx / 26) : ''}`)
    dataStartIndex = 0
  } else {
    // Clean and deduplicate headers
    headers = cleanHeaders(potentialHeaders.map((h) => convertToHeaderString(h)))
    dataStartIndex = headerIndex + 1
  }

  const dataRows = rawRows.slice(dataStartIndex)

  return { headerIndex, headers, dataRows }
}

/**
 * Check if a value is a Date object
 */
function isDateObject(value: unknown): boolean {
  return value instanceof Date
}

/**
 * Converts any value to a clean header string
 * Handles Date objects specially to avoid ugly toString output
 */
function convertToHeaderString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  // Handle Date objects - format as short date for headers
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return ''
    }
    // Format date as YYYY-MM-DD for header
    return value.toISOString().split('T')[0]
  }

  return String(value).trim()
}

/**
 * Cleans and deduplicates header names
 *
 * @param rawHeaders - Raw header strings
 * @returns Clean, unique headers
 */
function cleanHeaders(rawHeaders: string[]): string[] {
  const seen = new Map<string, number>()
  const cleaned: string[] = []

  for (let header of rawHeaders) {
    // Remove excessive whitespace
    header = header.replace(/\s+/g, ' ').trim()

    // Truncate very long headers
    if (header.length > 50) {
      header = header.substring(0, 47) + '...'
    }

    // If empty after sanitization, use Column_X
    if (!header) {
      header = `Column_${String.fromCharCode(65 + (cleaned.length % 26))}${cleaned.length >= 26 ? Math.floor(cleaned.length / 26) : ''}`
    }

    // Deduplicate
    if (seen.has(header)) {
      const count = seen.get(header)! + 1
      seen.set(header, count)
      cleaned.push(`${header}_${count}`)
    } else {
      seen.set(header, 1)
      cleaned.push(header)
    }
  }

  return cleaned
}

/**
 * Normalises date values to ISO 8601 format
 *
 * Supports: Date objects, Excel serial numbers, dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd,
 * dd-Mon-yy, Month dd, yyyy
 *
 * @param values - Raw date values
 * @returns Normalised ISO date strings or null for unparseable values
 */
export function normaliseDates(values: unknown[]): (string | null)[] {
  return values.map((value) => {
    if (value === null || value === undefined || value === '') {
      return null
    }

    // Handle Date objects directly (from cellDates: true)
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return null
      }
      return value.toISOString()
    }

    const strValue = String(value).trim()

    // Try standard Date constructor first (handles ISO format well)
    // But only for strings that look like dates, not numbers
    if (strValue.includes('-') || strValue.includes('/')) {
      // Try UK format dd/mm/yyyy first (prefer over US format for ambiguous dates)
      const ukDateMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
      if (ukDateMatch) {
        const [, day, month, year] = ukDateMatch
        const fullYear = year.length === 2 ? `20${year}` : year
        const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day))
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      }

      // Try dd-Mon-yy format (e.g., 15-Jan-25)
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      const monthMatch = strValue.match(/^(\d{1,2})-([a-z]{3})-(\d{2,4})$/i)
      if (monthMatch) {
        const [, day, monthName, year] = monthMatch
        const monthIndex = monthNames.indexOf(monthName.toLowerCase())
        if (monthIndex !== -1) {
          const fullYear = year.length === 2 ? `20${year}` : year
          const date = new Date(parseInt(fullYear), monthIndex, parseInt(day))
          if (!isNaN(date.getTime())) {
            return date.toISOString()
          }
        }
      }

      // Try ISO format yyyy-mm-dd
      const isoMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (isoMatch) {
        const date = new Date(strValue)
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      }
    }

    // Try parsing as Excel serial number (days since 1900-01-01)
    // Only for plain numbers, not strings that look like dates
    const excelSerial = parseFloat(strValue)
    if (
      !isNaN(excelSerial) &&
      excelSerial > 1 &&
      excelSerial < 73000 &&
      !strValue.includes('/') &&
      !strValue.includes('-') &&
      /^\d+(\.\d+)?$/.test(strValue) // Only pure numbers
    ) {
      try {
        // Excel epoch is Jan 1, 1900, but there's a leap year bug
        // Excel thinks 1900 was a leap year, so dates after Feb 28, 1900 are off by 1
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)) // Dec 30, 1899
        const date = new Date(excelEpoch.getTime() + excelSerial * 86400000)
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1950 && date.getFullYear() <= 2100) {
          return date.toISOString()
        }
      } catch {
        // Continue
      }
    }

    // Failed to parse
    return null
  })
}

/**
 * Normalises number values
 *
 * Strips currency symbols, commas, percentage signs.
 * Converts (500) to -500.
 * Rounds to 4 decimal places.
 *
 * @param values - Raw number values
 * @returns Normalised numbers or null for unparseable values
 */
export function normaliseNumbers(values: unknown[]): (number | null)[] {
  return values.map((value) => {
    if (value === null || value === undefined || value === '') {
      return null
    }

    // If it's already a number, use it directly
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        return null
      }
      return Math.round(value * 10000) / 10000
    }

    let strValue = String(value).trim()

    // Handle negative numbers in parentheses: (500) -> -500
    const parenthesesMatch = strValue.match(/^\((\d+(?:,\d{3})*(?:\.\d+)?)\)$/)
    if (parenthesesMatch) {
      strValue = `-${parenthesesMatch[1]}`
    }

    // Strip currency symbols, commas, percentage signs
    strValue = strValue
      .replace(/[£$€¥,]/g, '')
      .replace(/%/g, '')
      .trim()

    const parsed = parseFloat(strValue)

    if (isNaN(parsed)) {
      return null
    }

    // Round to 4 decimal places
    return Math.round(parsed * 10000) / 10000
  })
}

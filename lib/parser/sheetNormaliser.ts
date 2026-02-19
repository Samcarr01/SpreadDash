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

  // Find first row where >50% of cells are non-empty strings
  let headerIndex = -1
  let potentialHeaders: unknown[] = []

  for (let i = 0; i < maxHeaderSearchRows; i++) {
    const row = rawRows[i] || []
    const nonEmptyCells = row.filter(
      (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''
    )

    if (nonEmptyCells.length > row.length * 0.5) {
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
    headers = firstRow.map((_, idx) => `Column_${String.fromCharCode(65 + idx)}`)
    dataStartIndex = 0
  } else {
    // Clean and deduplicate headers
    headers = cleanHeaders(potentialHeaders.map((h) => String(h || '').trim()))
    dataStartIndex = headerIndex + 1
  }

  const dataRows = rawRows.slice(dataStartIndex)

  return { headerIndex, headers, dataRows }
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
    // Sanitize: remove special characters except -, _, spaces
    header = header.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim()

    // If empty after sanitization, use Column_X
    if (!header) {
      header = `Column_${String.fromCharCode(65 + cleaned.length)}`
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
 * Supports: Excel serial numbers, dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd,
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

    const strValue = String(value).trim()

    // Try parsing as Excel serial number (days since 1900-01-01)
    // Only treat as Excel date if it's a whole number or has minimal decimal places
    // and is within realistic date range (1900-2100 = serial 1-73000)
    const excelSerial = parseFloat(strValue)
    if (
      !isNaN(excelSerial) &&
      excelSerial > 1 &&
      excelSerial < 73000 &&
      !strValue.includes('/') && // Exclude if it looks like a date string
      !strValue.includes('-') &&
      (excelSerial % 1 === 0 || excelSerial % 1 < 0.01) // Whole number or very small decimal
    ) {
      try {
        const excelEpoch = new Date(1899, 11, 30) // Excel epoch (Dec 30, 1899)
        const date = new Date(excelEpoch.getTime() + excelSerial * 86400000)
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      } catch {
        // Continue to string parsing
      }
    }

    // Try standard Date constructor
    const standardDate = new Date(strValue)
    if (!isNaN(standardDate.getTime())) {
      return standardDate.toISOString()
    }

    // Try UK format dd/mm/yyyy (prefer over US format for ambiguous dates)
    const ukDateMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (ukDateMatch) {
      const [, day, month, year] = ukDateMatch
      const fullYear = year.length === 2 ? `20${year}` : year
      const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }

    // Try dd-Mon-yy format (e.g., 15-Jan-25)
    const monthNames = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ]
    const monthMatch = strValue.match(/^(\d{1,2})-([a-z]{3})-(\d{2,4})$/i)
    if (monthMatch) {
      const [, day, monthName, year] = monthMatch
      const monthIndex = monthNames.indexOf(monthName.toLowerCase())
      if (monthIndex !== -1) {
        const fullYear = year.length === 2 ? `20${year}` : year
        const date = new Date(
          parseInt(fullYear),
          monthIndex,
          parseInt(day)
        )
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
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

    let strValue = String(value).trim()

    // Handle negative numbers in parentheses: (500) -> -500
    const parenthesesMatch = strValue.match(/^\((\d+(?:\.\d+)?)\)$/)
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

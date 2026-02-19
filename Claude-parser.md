# Parser — Smart Spreadsheet Analysis Engine

Server-side engine that takes a raw Excel/CSV file and produces structured, typed data ready for dashboard rendering. Handles messy real-world spreadsheets: blank rows, merged headers, mixed types, inconsistent dates.

## Features

### File Ingestion

#### Constraints
- **Parse server-side only — never send raw file to client**
- **Use SheetJS (`xlsx` package) for all parsing**
- **Support `.xlsx`, `.xls`, and `.csv` formats**
- **If workbook has multiple sheets, parse the first sheet only (v1)**
- **Max 100,000 rows — reject with clear error if exceeded**
- **Max 50 columns — reject with clear error if exceeded**
- *Strip leading/trailing whitespace from all cell values*

#### Flow
- Input: File buffer from upload API route
- Process: SheetJS reads buffer, extracts first sheet, converts to JSON array of row objects
- Output: `{ headers: string[], rows: Record<string, unknown>[], sheetName: string }`

### Header Detection

#### Constraints
- **First non-empty row is treated as the header row**
- **Skip fully blank rows at the top of the sheet (up to 10)**
- **Deduplicate header names by appending `_2`, `_3` etc.**
- **Sanitise headers: remove special characters except `-`, `_`, spaces**
- *If no clear header row is detected, generate Column_A, Column_B etc.*

#### Flow
- Input: Raw sheet JSON from SheetJS
- Process: Scan rows 0–10 for the first row where >50% of cells are non-empty strings. Use as header. Map remaining rows to these headers.
- Output: Clean headers array and re-keyed row objects

### Column Type Detection

#### Constraints
- **Sample the first 100 non-empty values per column for type detection**
- **Classification rules:**
  - `date`: >70% of samples parse as valid dates (ISO, UK dd/mm/yyyy, US mm/dd/yyyy, or Excel serial numbers)
  - `number`: >80% of samples parse as numbers (strip currency symbols £$€, commas, percentage signs)
  - `category`: text column with ≤20 unique values across the dataset
  - `text`: everything else
- **A column's type is final once detected — no re-classification mid-parse**
- *Store sample values (first 5) in column metadata for UI preview*

#### Flow
- Input: Headers and row objects
- Process: For each column, collect non-empty values, run classification rules in order (date first, then number, then category, then text)
- Output: `ColumnMeta[]` array with type, header, index, sample values, null count, unique count

### Date Normalisation

#### Constraints
- **All detected dates must be normalised to ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)**
- **Support these input formats:** Excel serial numbers, `dd/mm/yyyy`, `mm/dd/yyyy`, `yyyy-mm-dd`, `dd-Mon-yy`, `Month dd, yyyy`
- **If date format is ambiguous (e.g. 03/04/2025), prefer UK format `dd/mm/yyyy`**
- *Log a warning if >10% of date cells fail to parse*

#### Flow
- Input: Raw date values from a column classified as `date`
- Process: Attempt parsing with each format. On failure, leave as `null` and increment null count.
- Output: Normalised ISO date strings in the row data

### Number Normalisation

#### Constraints
- **Strip currency symbols (£, $, €, ¥), commas, and percentage signs before parsing**
- **Percentage values: store as decimal (e.g. 45% → 0.45) AND store a flag `isPercentage: true` in column meta**
- **Negative values in parentheses: `(500)` → `-500`**
- *Round all numbers to 4 decimal places max*

#### Flow
- Input: Raw values from a column classified as `number`
- Process: Clean string, parse to float, apply rounding
- Output: Clean numeric values in row data

### Sheet Normalisation Summary

#### Constraints
- **The final output must be a fully clean, typed dataset ready for Recharts**
- **Null/empty cells in numeric columns default to `null` (not 0)**
- **The parser must return both `raw_data` (row objects) and `sheet_meta` (column metadata)**

#### Complete Output Shape
```typescript
interface ParseResult {
  success: boolean;
  data: {
    raw_data: Record<string, unknown>[];   // Cleaned row objects
    sheet_meta: SheetMeta;                  // Full column metadata
  } | null;
  error?: string;
  warnings: string[];                       // Non-fatal issues (e.g. some dates failed to parse)
}
```

## Edge Cases

- Completely empty file → Return error "File contains no data"
- File with headers but no data rows → Return error "No data rows found"
- All columns are text → Valid parse, but insights engine will flag "No numeric data for analysis"
- Single column → Valid parse, limited dashboard (KPI card only, no charts)
- Date column with mixed formats → Attempt each format per cell, log warnings for failures

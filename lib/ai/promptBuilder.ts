/**
 * Prompt construction for Claude Haiku AI analysis
 */

import { SheetMeta, InsightsResult } from '@/types'

/**
 * System prompt defining the AI analyst role
 */
export function buildSystemPrompt(): string {
  return `You are a senior data analyst reviewing a spreadsheet upload for an internal business team. You receive:
1. Column metadata (names, types, sample values)
2. Pre-computed statistics (KPIs, trends, correlations)
3. A sample of the actual data (first 50 rows, last 20 rows for large datasets)

Your job is to provide actionable business intelligence:

1. EXECUTIVE SUMMARY (3-5 sentences, max 1000 chars)
   - What does this data represent?
   - What are the key findings?
   - What's the overall story?

2. KEY TAKEAWAYS (3-4 bullet points, max 150 chars each)
   - Short, punchy insights that a busy executive can scan
   - Start each with an action verb or key metric

3. CROSS-COLUMN PATTERNS (2-3 items, max 300 chars each)
   - Relationships between different columns
   - Trends the automated system might miss
   - Correlations or anomalies

4. QUICK WINS (2-3 items, max 200 chars each)
   - Easy, low-effort improvements the team can make TODAY
   - Specific and actionable

5. NEXT STEPS (2-3 items, max 200 chars each)
   - Strategic recommendations for the coming weeks
   - Prioritized by impact

6. DATA QUALITY CONCERNS (if any, max 200 chars each)
   - Missing values, outliers, formatting issues
   - Only include if genuinely problematic

7. DISPLAY RECOMMENDATIONS
   - topMetrics: Which 3-6 metrics/channels are MOST important for this data?
   - focusAreas: What should the team pay attention to? (2-3 areas)
   - chartSuggestion: What type of chart would best visualize this data?
   - periodType: If columns have _1, _2, _3 suffixes, what do they represent? (month/quarter/week/year/period)
   - periodLabels: CRITICAL - You MUST provide actual month names, NOT generic labels.
     * Look at the column suffixes (e.g., Website_1, Website_2, Website_3, Website_4)
     * The numbers represent sequential time periods - infer which months they are
     * For 4-5 periods, assume recent months like ["February", "March", "April", "May"]
     * For 12 periods, use ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
     * If quarterly data: ["Q1", "Q2", "Q3", "Q4"]
     * FORBIDDEN: Never output "Period 1", "Period 2", "Period X" - these are useless
     * When in doubt, use month names starting from January or the most recent months

Rules:
- Be SPECIFIC: reference actual column names, numbers, and percentages
- Be ACTIONABLE: every recommendation should be something they can DO
- Be CONCISE: the team is busy, every word must earn its place
- Be HONEST: if data is insufficient, say so
- NEVER invent data points not in the sample
- Respond in valid JSON matching the required schema`
}

/**
 * Builds the user prompt with sheet metadata, insights and data sample
 */
export function buildUserPrompt(
  sheetMeta: SheetMeta,
  insightsResult: InsightsResult,
  rawData: Record<string, unknown>[],
  filename?: string
): string {
  // Prepare data sample with token budget management
  const dataSample = prepareSample(rawData, sheetMeta, insightsResult)

  // Build the prompt
  const dateColumnName =
    sheetMeta.dateColumnIndex !== null
      ? sheetMeta.headers[sheetMeta.dateColumnIndex]
      : 'None detected'

  const numericColumnNames = sheetMeta.numericColumnIndices
    .map((i) => sheetMeta.headers[i])
    .slice(0, 15)
    .join(', ')

  const categoryColumnNames = sheetMeta.categoryColumnIndices
    .map((i) => sheetMeta.headers[i])
    .slice(0, 10)
    .join(', ')

  const kpiSummary = insightsResult.kpis
    .map((k) => `- ${k.columnName}: ${k.formattedCurrent} (${k.formattedChange}, ${k.changeDirection})`)
    .join('\n') || 'No KPIs detected'

  const trendSummary = insightsResult.trends
    .map((t) => `- ${t.columnName}: ${t.trend} trend (${t.changePercent > 0 ? '+' : ''}${t.changePercent.toFixed(1)}%)`)
    .join('\n') || 'No trends detected'

  const insightsSummary = insightsResult.insights
    .map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`)
    .join('\n') || 'No rule-based insights generated'

  // Get first 50 and last 20 rows from sample for better context
  const firstRows = dataSample.slice(0, 50)
  const lastRows = dataSample.slice(-20)

  // Strip whitespace from JSON
  const firstRowsJSON = JSON.stringify(firstRows, null, 0)
  const lastRowsJSON = JSON.stringify(lastRows, null, 0)

  // Detect time series columns for period inference
  const timeSeriesInfo = detectTimeSeriesPattern(sheetMeta.headers)

  // Extract date values from data if available
  const dateValues = extractDateValues(rawData, sheetMeta)

  // Calculate sampling info
  const isSampled = rawData.length > dataSample.length
  const samplingNote = isSampled
    ? `\n\nNote: This is a representative sample of ${dataSample.length} rows from ${rawData.length.toLocaleString()} total rows.`
    : ''

  return `## Dataset Overview
- Filename: ${filename || 'Unknown'}
- Total: ${sheetMeta.totalRows.toLocaleString()} rows × ${sheetMeta.totalColumns} columns
- Columns: ${sheetMeta.headers.join(', ')}
- Date column: ${dateColumnName}
- Numeric columns: ${numericColumnNames || 'None'}
- Category columns: ${categoryColumnNames || 'None'}
${timeSeriesInfo}
${dateValues}

## Pre-Computed KPIs (automated)
${kpiSummary}

## Detected Trends (automated)
${trendSummary}

## Rule-Based Insights (automated)
${insightsSummary}

## Data Sample (first ${firstRows.length} rows)
${firstRowsJSON}

## Data Sample (last ${Math.min(lastRows.length, 20)} rows)
${lastRowsJSON}${samplingNote}

---

CRITICAL REQUIREMENT FOR periodLabels:
You MUST provide actual month names in periodLabels. Look at the column pattern (e.g., Website_1, Website_2, Website_3, Website_4).
These numbers represent sequential time periods. Provide month names like ["February", "March", "April", "May"].
NEVER output "Period 1", "Period 2", etc. - this is FORBIDDEN.

Analyze this data and respond with valid JSON:
{
  "executiveSummary": "3-5 sentence summary of the data and key findings",
  "keyTakeaways": [
    "Takeaway 1 (start with action verb or key metric)",
    "Takeaway 2",
    "Takeaway 3"
  ],
  "crossColumnPatterns": [
    "Pattern 1 describing relationship between columns",
    "Pattern 2"
  ],
  "quickWins": [
    "Easy improvement they can do today",
    "Another quick win"
  ],
  "nextSteps": [
    "Strategic recommendation for next week",
    "Another next step"
  ],
  "actionItems": [
    "Specific action the team should take",
    "Another action item"
  ],
  "dataQualityConcerns": ["Only if there are genuine issues, otherwise empty array"],
  "displayRecommendations": {
    "topMetrics": ["Facebook", "Website", "YouTube"],
    "focusAreas": ["Facebook growth opportunity", "Website traffic decline"],
    "chartSuggestion": "Line chart showing channel performance over time",
    "periodType": "month",
    "periodLabels": ["February", "March", "April", "May"]
  }
}`
}

/**
 * Detect time series column patterns like Channel_1, Channel_2 or Column_A, Column_B
 */
function detectTimeSeriesPattern(headers: string[]): string {
  const numberPattern = /^(.+?)_(\d+)$/
  const letterPattern = /^(.+?)_([A-Z])(\d*)$/
  const groups: Map<string, { periods: number[]; isLetterBased: boolean }> = new Map()

  headers.forEach((header) => {
    // Try number pattern first
    let match = header.match(numberPattern)
    if (match) {
      const baseName = match[1]
      const period = parseInt(match[2], 10)

      if (!groups.has(baseName)) {
        groups.set(baseName, { periods: [], isLetterBased: false })
      }
      groups.get(baseName)!.periods.push(period)
      return
    }

    // Try letter pattern
    match = header.match(letterPattern)
    if (match) {
      const baseName = match[1]
      const letter = match[2]
      const suffix = match[3] ? parseInt(match[3], 10) : 0
      const period = suffix * 26 + (letter.charCodeAt(0) - 64)

      if (!groups.has(baseName)) {
        groups.set(baseName, { periods: [], isLetterBased: true })
      }
      groups.get(baseName)!.periods.push(period)
    }
  })

  if (groups.size === 0) return ''

  const entries = Array.from(groups.entries())
    .filter(([, data]) => data.periods.length >= 2)
    .map(([name, data]) => {
      const min = Math.min(...data.periods)
      const max = Math.max(...data.periods)
      const type = data.isLetterBased ? 'columns' : 'periods'
      return `${name}: ${type} ${min}-${max} (${data.periods.length} total)`
    })
    .slice(0, 5)

  if (entries.length === 0) return ''

  return `- Time series columns detected: ${entries.join('; ')}`
}

/**
 * Extract date values from data for period inference
 */
function extractDateValues(
  rawData: Record<string, unknown>[],
  sheetMeta: SheetMeta
): string {
  if (sheetMeta.dateColumnIndex === null) return ''

  const dateColumn = sheetMeta.headers[sheetMeta.dateColumnIndex]
  const dateValues = rawData
    .slice(0, 10)
    .map((row) => row[dateColumn])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .slice(0, 5)

  if (dateValues.length === 0) return ''

  return `- Sample date values: ${dateValues.join(', ')}`
}

/**
 * Prepares data sample with token budget management
 * Increased budget to 15,000 tokens (Haiku supports 200K input)
 */
function prepareSample(
  rawData: Record<string, unknown>[],
  sheetMeta: SheetMeta,
  insightsResult: InsightsResult
): Record<string, unknown>[] {
  // Estimate: each row ~100 chars, ~25 tokens
  const estimatedTokens = rawData.length * sheetMeta.totalColumns * 5

  // Increased from 2,500 to 15,000 tokens - Haiku can handle much more
  if (estimatedTokens < 15000) {
    return rawData
  }

  // Need to truncate - keep important columns and reduce rows
  const columnsToKeep = new Set<string>()

  // Keep date column
  if (sheetMeta.dateColumnIndex !== null) {
    columnsToKeep.add(sheetMeta.headers[sheetMeta.dateColumnIndex])
  }

  // Keep first two category columns (often key identifiers)
  sheetMeta.categoryColumnIndices.slice(0, 2).forEach((idx) => {
    columnsToKeep.add(sheetMeta.headers[idx])
  })

  // Keep top 10 numeric columns by absolute change percent (up from 5)
  const sortedKPIs = [...insightsResult.kpis].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  )

  sortedKPIs.slice(0, 10).forEach((kpi) => {
    columnsToKeep.add(kpi.columnName)
  })

  // If we don't have enough columns, add more numeric columns (up to 15)
  if (columnsToKeep.size < 15) {
    sheetMeta.numericColumnIndices.slice(0, 15).forEach((idx) => {
      columnsToKeep.add(sheetMeta.headers[idx])
    })
  }

  // Filter data to keep only selected columns
  const filteredData = rawData.map((row) => {
    const filtered: Record<string, unknown> = {}
    for (const col of columnsToKeep) {
      if (row[col] !== undefined) {
        filtered[col] = row[col]
      }
    }
    return filtered
  })

  // Increased from 15+5 to 50+20 rows for better sampling
  const truncated = [
    ...filteredData.slice(0, 50),
    ...filteredData.slice(-20),
  ]

  return truncated
}

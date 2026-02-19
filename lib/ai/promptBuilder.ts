/**
 * Prompt construction for Claude Haiku AI analysis
 */

import { SheetMeta, InsightsResult } from '@/types'

/**
 * System prompt defining the AI analyst role
 */
export function buildSystemPrompt(): string {
  return `You are a data analyst reviewing a spreadsheet upload for an internal business team. You receive:
1. Column metadata (names, types, sample values)
2. Pre-computed statistics (KPIs, trends, correlations)
3. A sample of the actual data (first 30 rows, last 10 rows)

Your job:
- Write a 3–5 sentence executive summary of what the data shows (max 1000 characters)
- Identify 2–3 cross-column patterns the rule-based engine might miss (max 300 characters each)
- Suggest 2–3 specific, actionable next steps the team should consider (max 300 characters each)
- Flag any data quality concerns — missing values, suspicious outliers, inconsistent formatting (max 200 characters each)

Rules:
- Be specific — reference actual column names and numbers
- Write in plain business English, not technical jargon
- Be concise — the team is busy
- CRITICAL: Respect character limits strictly (concerns: 200 chars max, patterns/actions: 300 chars max)
- If the data is too limited to draw conclusions, say so honestly
- Never invent data points that aren't in the provided sample
- Respond in valid JSON matching the required schema`
}

/**
 * Builds the user prompt with sheet metadata, insights and data sample
 *
 * Includes token budget management: if data sample is too large,
 * truncates to keep date + top 5 numeric columns, first 15 + last 5 rows.
 *
 * @param sheetMeta - Sheet metadata
 * @param insightsResult - Pre-computed insights
 * @param rawData - Full dataset
 * @returns Formatted user prompt
 */
export function buildUserPrompt(
  sheetMeta: SheetMeta,
  insightsResult: InsightsResult,
  rawData: Record<string, unknown>[]
): string {
  // Prepare data sample with token budget management
  let dataSample = prepareSample(rawData, sheetMeta, insightsResult)

  // Build the prompt
  const dateColumnName =
    sheetMeta.dateColumnIndex !== null
      ? sheetMeta.headers[sheetMeta.dateColumnIndex]
      : 'None'

  const numericColumnNames = sheetMeta.numericColumnIndices
    .map((i) => sheetMeta.headers[i])
    .join(', ')

  const kpiSummary = insightsResult.kpis
    .map((k) => `- ${k.columnName}: ${k.formattedCurrent} (${k.formattedChange})`)
    .join('\n')

  const trendSummary = insightsResult.trends
    .map((t) => `- ${t.columnName}: ${t.trend} (${t.changePercent.toFixed(1)}% change)`)
    .join('\n')

  const insightsSummary = insightsResult.insights
    .map((i) => `- [${i.type}] ${i.description}`)
    .join('\n')

  // Get first 30 and last 10 rows from sample
  const firstRows = dataSample.slice(0, 30)
  const lastRows = dataSample.slice(-10)

  // Strip whitespace from JSON
  const firstRowsJSON = JSON.stringify(firstRows, null, 0)
  const lastRowsJSON = JSON.stringify(lastRows, null, 0)

  return `## Sheet Overview
- ${sheetMeta.totalRows} rows, ${sheetMeta.totalColumns} columns
- Columns: ${sheetMeta.headers.join(', ')}
- Date column: ${dateColumnName}
- Numeric columns: ${numericColumnNames || 'None'}

## Pre-Computed KPIs
${kpiSummary || 'No KPIs available'}

## Detected Trends
${trendSummary || 'No trends detected'}

## Rule-Based Insights
${insightsSummary || 'No insights generated'}

## Data Sample (first ${firstRows.length} rows)
${firstRowsJSON}

## Data Sample (last ${lastRows.length} rows)
${lastRowsJSON}

Respond with valid JSON matching this schema:
{
  "executiveSummary": "string (3-5 sentences)",
  "crossColumnPatterns": ["string", "string"],
  "actionItems": ["string", "string"],
  "dataQualityConcerns": ["string"] or []
}`
}

/**
 * Prepares data sample with token budget management
 *
 * If sample is too large (>2500 tokens estimated):
 * - Keep date columns
 * - Keep top 5 numeric columns by change %
 * - Drop text columns
 * - Reduce to first 15 + last 5 rows
 */
function prepareSample(
  rawData: Record<string, unknown>[],
  sheetMeta: SheetMeta,
  insightsResult: InsightsResult
): Record<string, unknown>[] {
  // Estimate: each row ~100 chars, ~25 tokens
  // 40 rows × 25 = 1000 tokens (conservative)
  const estimatedTokens = rawData.length * sheetMeta.totalColumns * 5

  if (estimatedTokens < 2500) {
    // Sample is small enough, return as-is
    return rawData
  }

  // Need to truncate - keep important columns and reduce rows
  const columnsToKeep = new Set<string>()

  // Keep date column
  if (sheetMeta.dateColumnIndex !== null) {
    columnsToKeep.add(sheetMeta.headers[sheetMeta.dateColumnIndex])
  }

  // Keep top 5 numeric columns by absolute change percent
  const sortedKPIs = [...insightsResult.kpis].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  )

  sortedKPIs.slice(0, 5).forEach((kpi) => {
    columnsToKeep.add(kpi.columnName)
  })

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

  // Reduce to first 15 + last 5 rows
  const truncated = [
    ...filteredData.slice(0, 15),
    ...filteredData.slice(-5),
  ]

  return truncated
}

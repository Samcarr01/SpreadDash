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
3. A sample of the actual data (first 30 rows, last 10 rows)

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
   - periodLabels: IMPORTANT - Provide human-readable date labels, NOT "Period 1", "Period 2" etc.
     * If periodType is "month": Use month names like ["Jan", "Feb", "Mar", "Apr"] or ["January", "February", "March", "April"]
     * If periodType is "quarter": Use ["Q1", "Q2", "Q3", "Q4"]
     * If periodType is "week": Use ["Week 1", "Week 2", "Week 3"] or actual dates
     * If you can infer the actual dates from context, use them (e.g., ["Jan 2024", "Feb 2024"])
     * NEVER use generic labels like "Period 1", "Period 2" - these are meaningless to users

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
  rawData: Record<string, unknown>[]
): string {
  // Prepare data sample with token budget management
  let dataSample = prepareSample(rawData, sheetMeta, insightsResult)

  // Build the prompt
  const dateColumnName =
    sheetMeta.dateColumnIndex !== null
      ? sheetMeta.headers[sheetMeta.dateColumnIndex]
      : 'None detected'

  const numericColumnNames = sheetMeta.numericColumnIndices
    .map((i) => sheetMeta.headers[i])
    .slice(0, 10)
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

  // Get first 30 and last 10 rows from sample
  const firstRows = dataSample.slice(0, 30)
  const lastRows = dataSample.slice(-10)

  // Strip whitespace from JSON
  const firstRowsJSON = JSON.stringify(firstRows, null, 0)
  const lastRowsJSON = JSON.stringify(lastRows, null, 0)

  return `## Dataset Overview
- Total: ${sheetMeta.totalRows.toLocaleString()} rows × ${sheetMeta.totalColumns} columns
- Columns: ${sheetMeta.headers.join(', ')}
- Date column: ${dateColumnName}
- Numeric columns: ${numericColumnNames || 'None'}
- Category columns: ${categoryColumnNames || 'None'}

## Pre-Computed KPIs (automated)
${kpiSummary}

## Detected Trends (automated)
${trendSummary}

## Rule-Based Insights (automated)
${insightsSummary}

## Data Sample (first ${firstRows.length} rows)
${firstRowsJSON}

## Data Sample (last ${Math.min(lastRows.length, 10)} rows)
${lastRowsJSON}

---

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
 * Prepares data sample with token budget management
 */
function prepareSample(
  rawData: Record<string, unknown>[],
  sheetMeta: SheetMeta,
  insightsResult: InsightsResult
): Record<string, unknown>[] {
  // Estimate: each row ~100 chars, ~25 tokens
  const estimatedTokens = rawData.length * sheetMeta.totalColumns * 5

  if (estimatedTokens < 2500) {
    return rawData
  }

  // Need to truncate - keep important columns and reduce rows
  const columnsToKeep = new Set<string>()

  // Keep date column
  if (sheetMeta.dateColumnIndex !== null) {
    columnsToKeep.add(sheetMeta.headers[sheetMeta.dateColumnIndex])
  }

  // Keep first category column (often the key identifier)
  if (sheetMeta.categoryColumnIndices.length > 0) {
    columnsToKeep.add(sheetMeta.headers[sheetMeta.categoryColumnIndices[0]])
  }

  // Keep top 5 numeric columns by absolute change percent
  const sortedKPIs = [...insightsResult.kpis].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  )

  sortedKPIs.slice(0, 5).forEach((kpi) => {
    columnsToKeep.add(kpi.columnName)
  })

  // If we don't have enough columns, add more numeric columns
  if (columnsToKeep.size < 6) {
    sheetMeta.numericColumnIndices.slice(0, 6).forEach((idx) => {
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

  // Reduce to first 15 + last 5 rows
  const truncated = [
    ...filteredData.slice(0, 15),
    ...filteredData.slice(-5),
  ]

  return truncated
}
